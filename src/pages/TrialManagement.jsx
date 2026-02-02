import React, { useState, useEffect } from 'react';
import { TrialUsage } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TrialOverrideDialog from '../components/backoffice/TrialOverrideDialog';
import { format } from 'date-fns';

export default function TrialManagement() {
  const [trialUsages, setTrialUsages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overrideOrg, setOverrideOrg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const trialList = await TrialUsage.list('-created_date');
    setTrialUsages(trialList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenOverride = () => {
    setIsOverrideOpen(true);
  };

  const handleOverrideComplete = () => {
    loadData();
  };

  const filteredTrials = trialUsages.filter(trial =>
    trial.email_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (trial.organization_name && trial.organization_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    totalTrials: trialUsages.length,
    activeTrials: trialUsages.filter(t => new Date(t.trial_end_date) > new Date()).length,
    expiredTrials: trialUsages.filter(t => new Date(t.trial_end_date) <= new Date()).length,
    overriddenTrials: trialUsages.filter(t => t.override_reason).length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trial Management</h2>
          <p className="text-gray-500">Monitor and manage trial usage across all organizations.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by email or organization..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleOpenOverride} className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Grant Trial Override
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Trials Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrials}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Trials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeTrials}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Expired Trials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.expiredTrials}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Overridden Trials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.overriddenTrials}</div>
          </CardContent>
        </Card>
      </div>

      {/* Trials Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email Address</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Trial Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Override Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan="5" className="h-24 text-center">Loading trial data...</TableCell>
              </TableRow>
            ) : filteredTrials.map((trial) => (
              <TableRow key={trial.id}>
                <TableCell className="font-medium">{trial.email_address}</TableCell>
                <TableCell>{trial.organization_name || 'N/A'}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{format(new Date(trial.trial_start_date), 'MMM d, yyyy')} - {format(new Date(trial.trial_end_date), 'MMM d, yyyy')}</div>
                    <div className="text-gray-500">
                      {Math.ceil((new Date(trial.trial_end_date) - new Date(trial.trial_start_date)) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={new Date(trial.trial_end_date) > new Date() ? 'default' : 'secondary'}>
                    {new Date(trial.trial_end_date) > new Date() ? 'Active' : 'Expired'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {trial.override_reason ? (
                    <div className="text-sm">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">Overridden</Badge>
                      <div className="mt-1 text-gray-600">By: {trial.overridden_by}</div>
                      <div className="text-gray-500">{trial.override_reason}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Regular trial</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filteredTrials.length === 0 && (
              <TableRow>
                <TableCell colSpan="5" className="h-24 text-center">No trial records found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TrialOverrideDialog
        isOpen={isOverrideOpen}
        onClose={() => setIsOverrideOpen(false)}
        emailAddress={overrideEmail}
        organizationName={overrideOrg}
        onComplete={handleOverrideComplete}
      />
    </div>
  );
}