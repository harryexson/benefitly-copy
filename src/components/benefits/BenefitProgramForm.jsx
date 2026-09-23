import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2 } from 'lucide-react';

export default function BenefitProgramForm({ program, onClose, user }) {
  const [formData, setFormData] = useState({
    program_name: '',
    program_type: 'custom',
    description: '',
    status: 'active',
    eligibility_criteria: {
      minimum_membership_months: 0,
      require_active_status: true,
      require_current_contributions: false,
      minimum_contribution_amount: 0,
      custom_requirements: ''
    },
    allocation_rules: {
      allocation_type: 'fixed_amount',
      fixed_amount: 0,
      percentage_of_contributions: 0,
      tier_amounts: [],
      max_benefit_per_year: 0,
      max_claims_per_year: 1
    },
    approval_workflow: {
      requires_approval: true,
      auto_approve_under_amount: 0,
      approval_levels: 1,
      approver_roles: ['Administrator'],
      notification_email: ''
    },
    disbursement_settings: {
      disbursement_method: 'bank_transfer',
      processing_days: 3,
      allow_instant_payout: false
    },
    budget_settings: {
      annual_budget: 0,
      current_year_spent: 0,
      budget_alert_threshold: 80
    },
    documentation_required: []
  });
  const [saving, setSaving] = useState(false);
  const [newDoc, setNewDoc] = useState('');
  const [newTier, setNewTier] = useState({ tier_name: '', min_months: 0, amount: 0 });

  useEffect(() => {
    if (program) {
      setFormData({
        ...program,
        eligibility_criteria: program.eligibility_criteria || formData.eligibility_criteria,
        allocation_rules: program.allocation_rules || formData.allocation_rules,
        approval_workflow: program.approval_workflow || formData.approval_workflow,
        disbursement_settings: program.disbursement_settings || formData.disbursement_settings,
        budget_settings: program.budget_settings || formData.budget_settings,
        documentation_required: program.documentation_required || []
      });
    }
  }, [program]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave = {
        ...formData,
        last_modified_by: user?.id,
        created_by_user_id: program ? program.created_by_user_id : user?.id
      };

      if (program) {
        await base44.entities.BenefitProgram.update(program.id, dataToSave);
      } else {
        await base44.entities.BenefitProgram.create(dataToSave);
      }

      onClose();
    } catch (error) {
      console.error('Error saving benefit program:', error);
      alert('Failed to save benefit program. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const addDocumentRequirement = () => {
    if (!newDoc.trim()) return;
    setFormData(prev => ({
      ...prev,
      documentation_required: [...(prev.documentation_required || []), newDoc.trim()]
    }));
    setNewDoc('');
  };

  const removeDocumentRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      documentation_required: prev.documentation_required.filter((_, i) => i !== index)
    }));
  };

  const addTier = () => {
    if (!newTier.tier_name || newTier.amount <= 0) return;
    setFormData(prev => ({
      ...prev,
      allocation_rules: {
        ...prev.allocation_rules,
        tier_amounts: [...(prev.allocation_rules.tier_amounts || []), { ...newTier }]
      }
    }));
    setNewTier({ tier_name: '', min_months: 0, amount: 0 });
  };

  const removeTier = (index) => {
    setFormData(prev => ({
      ...prev,
      allocation_rules: {
        ...prev.allocation_rules,
        tier_amounts: prev.allocation_rules.tier_amounts.filter((_, i) => i !== index)
      }
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{program ? 'Edit' : 'Create'} Benefit Program</DialogTitle>
          <DialogDescription>
            Configure benefit program settings, eligibility criteria, and disbursement rules
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="approval">Approval</TabsTrigger>
              <TabsTrigger value="disbursement">Disbursement</TabsTrigger>
            </TabsList>

            {/* Basic Info */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="program_name">Program Name *</Label>
                  <Input
                    id="program_name"
                    value={formData.program_name}
                    onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                    placeholder="e.g., Emergency Aid Fund"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="program_type">Program Type *</Label>
                  <Select
                    value={formData.program_type}
                    onValueChange={(value) => setFormData({ ...formData, program_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergency_aid">Emergency Aid</SelectItem>
                      <SelectItem value="educational_grants">Educational Grants</SelectItem>
                      <SelectItem value="medical_assistance">Medical Assistance</SelectItem>
                      <SelectItem value="housing_support">Housing Support</SelectItem>
                      <SelectItem value="funeral_expenses">Funeral Expenses</SelectItem>
                      <SelectItem value="childcare_assistance">Childcare Assistance</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the purpose and scope of this benefit program"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Budget Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="annual_budget">Annual Budget ($)</Label>
                      <Input
                        id="annual_budget"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.budget_settings.annual_budget}
                        onChange={(e) => updateField('budget_settings.annual_budget', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="budget_alert_threshold">Budget Alert Threshold (%)</Label>
                      <Input
                        id="budget_alert_threshold"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.budget_settings.budget_alert_threshold}
                        onChange={(e) => updateField('budget_settings.budget_alert_threshold', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Required Documentation</CardTitle>
                    <CardDescription>Specify what documents members must submit with claims</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newDoc}
                        onChange={(e) => setNewDoc(e.target.value)}
                        placeholder="e.g., Death Certificate, Medical Bills"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDocumentRequirement())}
                      />
                      <Button type="button" onClick={addDocumentRequirement} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formData.documentation_required?.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span>{doc}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocumentRequirement(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Eligibility */}
            <TabsContent value="eligibility" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Eligibility Criteria</CardTitle>
                  <CardDescription>Define who can claim this benefit</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="min_membership">Minimum Membership (months)</Label>
                    <Input
                      id="min_membership"
                      type="number"
                      min="0"
                      value={formData.eligibility_criteria.minimum_membership_months}
                      onChange={(e) => updateField('eligibility_criteria.minimum_membership_months', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_active">Require Active Member Status</Label>
                    <Switch
                      id="require_active"
                      checked={formData.eligibility_criteria.require_active_status}
                      onCheckedChange={(checked) => updateField('eligibility_criteria.require_active_status', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_current">Require Current on Contributions</Label>
                    <Switch
                      id="require_current"
                      checked={formData.eligibility_criteria.require_current_contributions}
                      onCheckedChange={(checked) => updateField('eligibility_criteria.require_current_contributions', checked)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="min_contribution">Minimum Total Contributions ($)</Label>
                    <Input
                      id="min_contribution"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.eligibility_criteria.minimum_contribution_amount}
                      onChange={(e) => updateField('eligibility_criteria.minimum_contribution_amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="custom_requirements">Custom Requirements</Label>
                    <Textarea
                      id="custom_requirements"
                      value={formData.eligibility_criteria.custom_requirements}
                      onChange={(e) => updateField('eligibility_criteria.custom_requirements', e.target.value)}
                      placeholder="Any additional eligibility requirements"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Allocation */}
            <TabsContent value="allocation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Allocation Rules</CardTitle>
                  <CardDescription>Define how benefit amounts are calculated</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="allocation_type">Allocation Type</Label>
                    <Select
                      value={formData.allocation_rules.allocation_type}
                      onValueChange={(value) => updateField('allocation_rules.allocation_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                        <SelectItem value="percentage_based">Percentage of Contributions</SelectItem>
                        <SelectItem value="tier_based">Tier Based</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.allocation_rules.allocation_type === 'fixed_amount' && (
                    <div>
                      <Label htmlFor="fixed_amount">Fixed Benefit Amount ($)</Label>
                      <Input
                        id="fixed_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.allocation_rules.fixed_amount}
                        onChange={(e) => updateField('allocation_rules.fixed_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  {formData.allocation_rules.allocation_type === 'percentage_based' && (
                    <div>
                      <Label htmlFor="percentage">Percentage of Total Contributions (%)</Label>
                      <Input
                        id="percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.allocation_rules.percentage_of_contributions}
                        onChange={(e) => updateField('allocation_rules.percentage_of_contributions', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  {formData.allocation_rules.allocation_type === 'tier_based' && (
                    <div>
                      <Label>Benefit Tiers</Label>
                      <div className="space-y-2 mb-3">
                        {formData.allocation_rules.tier_amounts?.map((tier, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <Badge>{tier.tier_name}</Badge>
                            <span className="text-sm">≥ {tier.min_months} months</span>
                            <span className="text-sm font-semibold">${tier.amount}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTier(index)}
                              className="ml-auto"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input
                          placeholder="Tier name"
                          value={newTier.tier_name}
                          onChange={(e) => setNewTier({ ...newTier, tier_name: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Min months"
                          value={newTier.min_months}
                          onChange={(e) => setNewTier({ ...newTier, min_months: parseInt(e.target.value) || 0 })}
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={newTier.amount}
                          onChange={(e) => setNewTier({ ...newTier, amount: parseFloat(e.target.value) || 0 })}
                        />
                        <Button type="button" onClick={addTier} variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="max_benefit">Maximum Benefit Per Year ($)</Label>
                    <Input
                      id="max_benefit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.allocation_rules.max_benefit_per_year}
                      onChange={(e) => updateField('allocation_rules.max_benefit_per_year', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_claims">Maximum Claims Per Year</Label>
                    <Input
                      id="max_claims"
                      type="number"
                      min="1"
                      value={formData.allocation_rules.max_claims_per_year}
                      onChange={(e) => updateField('allocation_rules.max_claims_per_year', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Approval */}
            <TabsContent value="approval" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Approval Workflow</CardTitle>
                  <CardDescription>Configure claim approval process</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="requires_approval">Require Manual Approval</Label>
                    <Switch
                      id="requires_approval"
                      checked={formData.approval_workflow.requires_approval}
                      onCheckedChange={(checked) => updateField('approval_workflow.requires_approval', checked)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="auto_approve">Auto-Approve Under Amount ($)</Label>
                    <Input
                      id="auto_approve"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.approval_workflow.auto_approve_under_amount}
                      onChange={(e) => updateField('approval_workflow.auto_approve_under_amount', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Claims under this amount will be auto-approved if eligible</p>
                  </div>

                  <div>
                    <Label htmlFor="approval_levels">Number of Approval Levels</Label>
                    <Select
                      value={formData.approval_workflow.approval_levels.toString()}
                      onValueChange={(value) => updateField('approval_workflow.approval_levels', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Level</SelectItem>
                        <SelectItem value="2">2 Levels</SelectItem>
                        <SelectItem value="3">3 Levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notification_email">Notification Email</Label>
                    <Input
                      id="notification_email"
                      type="email"
                      value={formData.approval_workflow.notification_email}
                      onChange={(e) => updateField('approval_workflow.notification_email', e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Disbursement */}
            <TabsContent value="disbursement" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Disbursement Settings</CardTitle>
                  <CardDescription>Configure how benefits are disbursed to members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="disbursement_method">Disbursement Method</Label>
                    <Select
                      value={formData.disbursement_settings.disbursement_method}
                      onValueChange={(value) => updateField('disbursement_settings.disbursement_method', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer (Stripe)</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="virtual_card">Virtual Card</SelectItem>
                        <SelectItem value="tremendous_rewards">Tremendous Rewards</SelectItem>
                        <SelectItem value="member_choice">Member Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="processing_days">Standard Processing Time (days)</Label>
                    <Input
                      id="processing_days"
                      type="number"
                      min="1"
                      value={formData.disbursement_settings.processing_days}
                      onChange={(e) => updateField('disbursement_settings.processing_days', parseInt(e.target.value) || 3)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="instant_payout">Allow Instant Payout (with fees)</Label>
                    <Switch
                      id="instant_payout"
                      checked={formData.disbursement_settings.allow_instant_payout}
                      onCheckedChange={(checked) => updateField('disbursement_settings.allow_instant_payout', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : program ? 'Update Program' : 'Create Program'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}