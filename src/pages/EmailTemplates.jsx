import React, { useState, useEffect } from 'react';
import { EmailTemplate } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Mail, Plus, Edit, Eye, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const TEMPLATE_TYPES = [
    { value: 'welcome_new_member', label: 'Welcome New Member', variables: ['member_name', 'member_first_name', 'member_number'] },
    { value: 'contribution_reminder', label: 'Contribution Reminder', variables: ['member_name', 'event_title', 'amount_due', 'due_date', 'days_until_due', 'payment_link'] },
    { value: 'contribution_overdue', label: 'Contribution Overdue', variables: ['member_name', 'event_title', 'amount_due', 'original_due_date', 'days_overdue', 'payment_link'] },
    { value: 'event_registration_reminder', label: 'Event Registration Reminder', variables: ['member_name', 'event_title', 'event_date', 'event_description', 'venue', 'days_until_event'] },
    { value: 'payout_notification', label: 'Payout Notification', variables: ['member_name', 'payout_amount', 'event_title', 'payout_method'] },
    { value: 'forum_new_post', label: 'Forum New Post', variables: ['member_name', 'thread_title', 'category_name', 'thread_link'] },
    { value: 'proposal_update', label: 'Proposal Update', variables: ['member_name', 'proposal_title', 'proposal_status', 'proposal_link'] },
    { value: 'event_created', label: 'New Event Created', variables: ['member_name', 'event_title', 'event_date', 'contribution_amount', 'event_link'] },
    { value: 'general_announcement', label: 'General Announcement', variables: ['member_name', 'announcement_title', 'announcement_body'] },
    { value: 'custom', label: 'Custom Template', variables: ['member_name'] }
];

const DEFAULT_TEMPLATES = {
    'welcome_new_member': {
        subject: 'Welcome to Our Association!',
        body: 'Dear member,\n\nWelcome to our mutual aid association!\n\nBest regards,\nThe Association Team'
    },
    'contribution_reminder': {
        subject: 'Upcoming Payment Due',
        body: 'Dear member,\n\nYou have an upcoming payment due.\n\nBest regards,\nThe Association Team'
    },
    'contribution_overdue': {
        subject: 'Overdue Payment Notice',
        body: 'Dear member,\n\nYour payment is overdue.\n\nBest regards,\nThe Association Team'
    }
};

export default function EmailTemplates() {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [previewTemplate, setPreviewTemplate] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        template_type: 'custom',
        subject_line: '',
        email_body: '',
        is_active: true,
        send_from_name: 'Benefitly',
        send_from_email: ''
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const templateList = await EmailTemplate.list();
            setTemplates(templateList);
        } catch (error) {
            console.error('Failed to load templates:', error);
            toast.error('Failed to load email templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenForm = (template = null) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                template_type: template.template_type,
                subject_line: template.subject_line,
                email_body: template.email_body,
                is_active: template.is_active,
                send_from_name: template.send_from_name || 'Benefitly',
                send_from_email: template.send_from_email || ''
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: '',
                template_type: 'custom',
                subject_line: '',
                email_body: '',
                is_active: true,
                send_from_name: 'Benefitly',
                send_from_email: ''
            });
        }
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.subject_line || !formData.email_body) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const templateData = {
                ...formData,
                variables: JSON.stringify(getVariablesForType(formData.template_type))
            };

            if (editingTemplate) {
                await EmailTemplate.update(editingTemplate.id, templateData);
                toast.success('Template updated successfully');
            } else {
                await EmailTemplate.create(templateData);
                toast.success('Template created successfully');
            }

            setIsFormOpen(false);
            loadTemplates();
        } catch (error) {
            console.error('Failed to save template:', error);
            toast.error('Failed to save template');
        }
    };

    const handleDuplicate = async (template) => {
        try {
            const newTemplate = {
                name: template.name + ' (Copy)',
                template_type: template.template_type,
                subject_line: template.subject_line,
                email_body: template.email_body,
                is_active: template.is_active,
                send_from_name: template.send_from_name,
                send_from_email: template.send_from_email,
                variables: template.variables
            };

            await EmailTemplate.create(newTemplate);
            toast.success('Template duplicated successfully');
            loadTemplates();
        } catch (error) {
            console.error('Failed to duplicate template:', error);
            toast.error('Failed to duplicate template');
        }
    };

    const handleToggleActive = async (template) => {
        try {
            await EmailTemplate.update(template.id, { is_active: !template.is_active });
            const message = !template.is_active ? 'activated' : 'deactivated';
            toast.success('Template ' + message);
            loadTemplates();
        } catch (error) {
            console.error('Failed to update template:', error);
            toast.error('Failed to update template');
        }
    };

    const handleLoadDefault = (templateType) => {
        const defaultTemplate = DEFAULT_TEMPLATES[templateType];
        if (defaultTemplate) {
            setFormData(prev => ({
                ...prev,
                subject_line: defaultTemplate.subject,
                email_body: defaultTemplate.body
            }));
            toast.success('Default template loaded');
        }
    };

    const getVariablesForType = (type) => {
        const templateType = TEMPLATE_TYPES.find(t => t.value === type);
        return templateType ? templateType.variables : ['member_name'];
    };

    const getTypeLabel = (type) => {
        const templateType = TEMPLATE_TYPES.find(t => t.value === type);
        return templateType ? templateType.label : type;
    };

    const copyVariableToClipboard = (varName) => {
        const textToCopy = '{{' + varName + '}}';
        navigator.clipboard.writeText(textToCopy);
        toast.success('Variable copied');
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Email Templates</h2>
                    <p className="text-gray-500">Manage automated communication templates</p>
                </div>
                <Button onClick={() => handleOpenForm()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                </Button>
            </div>

            <div className="grid gap-4">
                {templates.map(template => (
                    <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Mail className="h-5 w-5 text-blue-600" />
                                        <CardTitle>{template.name}</CardTitle>
                                        {!template.is_active && (
                                            <Badge variant="outline" className="bg-gray-100">Inactive</Badge>
                                        )}
                                    </div>
                                    <Badge variant="outline">{getTypeLabel(template.template_type)}</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setPreviewTemplate(template);
                                            setIsPreviewOpen(true);
                                        }}
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDuplicate(template)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenForm(template)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Switch
                                        checked={template.is_active}
                                        onCheckedChange={() => handleToggleActive(template)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm text-gray-500">Subject:</p>
                                    <p className="text-sm font-medium">{template.subject_line}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Variables:</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {getVariablesForType(template.template_type).map(v => (
                                            <Badge key={v} variant="secondary" className="text-xs">
                                                {v}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {templates.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Email Templates</h3>
                            <p className="text-gray-600 mb-4">Create your first email template</p>
                            <Button onClick={() => handleOpenForm()}>
                                Create Template
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
                        </DialogTitle>
                        <DialogDescription>
                            Use double curly braces around variable names to personalize emails
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Template Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g., Welcome Email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Template Type</Label>
                                <Select
                                    value={formData.template_type}
                                    onValueChange={(value) => {
                                        setFormData({...formData, template_type: value});
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEMPLATE_TYPES.map(type => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {DEFAULT_TEMPLATES[formData.template_type] && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <p className="text-sm text-blue-900">
                                    A default template is available for this type.
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleLoadDefault(formData.template_type)}
                                    className="ml-auto"
                                >
                                    Load Default
                                </Button>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Available Variables (click to copy)</Label>
                            <div className="flex flex-wrap gap-1">
                                {getVariablesForType(formData.template_type).map(v => (
                                    <Badge 
                                        key={v} 
                                        variant="secondary" 
                                        className="cursor-pointer" 
                                        onClick={() => copyVariableToClipboard(v)}
                                    >
                                        {v}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Subject Line</Label>
                            <Input
                                value={formData.subject_line}
                                onChange={(e) => setFormData({...formData, subject_line: e.target.value})}
                                placeholder="Enter subject line"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Email Body</Label>
                            <Textarea
                                value={formData.email_body}
                                onChange={(e) => setFormData({...formData, email_body: e.target.value})}
                                placeholder="Enter email content"
                                rows={12}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                            />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {editingTemplate ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Template Preview</DialogTitle>
                        <DialogDescription>
                            Variables will be replaced with actual data when sent
                        </DialogDescription>
                    </DialogHeader>
                    {previewTemplate && (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-gray-500">Subject:</Label>
                                <p className="font-medium mt-1">{previewTemplate.subject_line}</p>
                            </div>
                            <div>
                                <Label className="text-gray-500">Body:</Label>
                                <div className="mt-2 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                                    {previewTemplate.email_body}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}