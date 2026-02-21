import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, FileText, DollarSign, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function BenefitProgramDetails({ program, claims, onClose, onEdit }) {
  const totalClaims = claims.length;
  const approvedClaims = claims.filter(c => c.status === 'approved' || c.status === 'disbursed').length;
  const rejectedClaims = claims.filter(c => c.status === 'rejected').length;
  const pendingClaims = claims.filter(c => ['pending_review', 'pending_approval', 'under_review'].includes(c.status)).length;
  const totalApproved = claims
    .filter(c => c.status === 'approved' || c.status === 'disbursed')
    .reduce((sum, c) => sum + (c.approved_amount || 0), 0);

  const getStatusBadge = (status) => {
    const badges = {
      active: <Badge className="bg-green-500">Active</Badge>,
      inactive: <Badge className="bg-gray-500">Inactive</Badge>,
      archived: <Badge className="bg-gray-400">Archived</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{program.program_name}</h1>
              {getStatusBadge(program.status)}
              <Badge variant="outline" className="capitalize">
                {program.program_type?.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-gray-600">{program.description}</p>
          </div>
        </div>
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Program
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Total Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalClaims}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{approvedClaims}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingClaims}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-blue-500" />
              Total Disbursed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">${totalApproved.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Eligibility Criteria */}
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Minimum Membership:</span>
              <span className="font-semibold">{program.eligibility_criteria?.minimum_membership_months || 0} months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Status Required:</span>
              <Badge variant={program.eligibility_criteria?.require_active_status ? "default" : "outline"}>
                {program.eligibility_criteria?.require_active_status ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Contributions:</span>
              <Badge variant={program.eligibility_criteria?.require_current_contributions ? "default" : "outline"}>
                {program.eligibility_criteria?.require_current_contributions ? 'Required' : 'Not Required'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Minimum Contributions:</span>
              <span className="font-semibold">${(program.eligibility_criteria?.minimum_contribution_amount || 0).toLocaleString()}</span>
            </div>
            {program.eligibility_criteria?.custom_requirements && (
              <div className="pt-2 border-t">
                <p className="text-gray-600 text-sm mb-1">Custom Requirements:</p>
                <p className="text-sm">{program.eligibility_criteria.custom_requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allocation Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Allocation Type:</span>
              <Badge className="capitalize">{program.allocation_rules?.allocation_type?.replace('_', ' ')}</Badge>
            </div>
            
            {program.allocation_rules?.allocation_type === 'fixed_amount' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Fixed Amount:</span>
                <span className="font-semibold text-lg">${(program.allocation_rules.fixed_amount || 0).toLocaleString()}</span>
              </div>
            )}
            
            {program.allocation_rules?.allocation_type === 'percentage_based' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Percentage:</span>
                <span className="font-semibold text-lg">{program.allocation_rules.percentage_of_contributions}%</span>
              </div>
            )}
            
            {program.allocation_rules?.tier_amounts?.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-gray-600 text-sm mb-2">Benefit Tiers:</p>
                <div className="space-y-1">
                  {program.allocation_rules.tier_amounts.map((tier, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{tier.tier_name} (≥{tier.min_months} mo):</span>
                      <span className="font-semibold">${tier.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Max Per Year:</span>
              <span className="font-semibold">${(program.allocation_rules?.max_benefit_per_year || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Claims/Year:</span>
              <span className="font-semibold">{program.allocation_rules?.max_claims_per_year || 1}</span>
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Manual Approval:</span>
              <Badge variant={program.approval_workflow?.requires_approval ? "default" : "outline"}>
                {program.approval_workflow?.requires_approval ? 'Required' : 'Not Required'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Auto-Approve Under:</span>
              <span className="font-semibold">${(program.approval_workflow?.auto_approve_under_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Approval Levels:</span>
              <Badge>{program.approval_workflow?.approval_levels || 1} Level(s)</Badge>
            </div>
            {program.approval_workflow?.notification_email && (
              <div className="pt-2 border-t">
                <p className="text-gray-600 text-sm">Notification Email:</p>
                <p className="text-sm font-mono">{program.approval_workflow.notification_email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disbursement Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Disbursement Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Method:</span>
              <Badge className="capitalize">{program.disbursement_settings?.disbursement_method?.replace('_', ' ')}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Processing Time:</span>
              <span className="font-semibold">{program.disbursement_settings?.processing_days || 3} business days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Instant Payout:</span>
              <Badge variant={program.disbursement_settings?.allow_instant_payout ? "default" : "outline"}>
                {program.disbursement_settings?.allow_instant_payout ? 'Available' : 'Not Available'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview */}
      {program.budget_settings?.annual_budget > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Annual Budget:</span>
                <span className="text-2xl font-bold">${program.budget_settings.annual_budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Spent This Year:</span>
                <span className="text-2xl font-bold text-blue-600">${(program.budget_settings.current_year_spent || 0).toLocaleString()}</span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Budget Utilization</span>
                  <span className="font-semibold">
                    {((program.budget_settings.current_year_spent / program.budget_settings.annual_budget) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      (program.budget_settings.current_year_spent / program.budget_settings.annual_budget) * 100 > 90 ? 'bg-red-500' :
                      (program.budget_settings.current_year_spent / program.budget_settings.annual_budget) * 100 > 75 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((program.budget_settings.current_year_spent / program.budget_settings.annual_budget) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remaining Budget:</span>
                <span className="font-semibold text-green-600">
                  ${(program.budget_settings.annual_budget - (program.budget_settings.current_year_spent || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Required Documentation */}
      {program.documentation_required?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Required Documentation</CardTitle>
            <CardDescription>Documents that members must submit with claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {program.documentation_required.map((doc, i) => (
                <Badge key={i} variant="outline" className="justify-start">
                  <FileText className="h-3 w-3 mr-2" />
                  {doc}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}