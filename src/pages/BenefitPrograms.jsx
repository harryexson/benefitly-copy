import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Users, DollarSign, FileText, Archive, Edit, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BenefitProgramForm from '../components/benefits/BenefitProgramForm';
import BenefitProgramDetails from '../components/benefits/BenefitProgramDetails';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BenefitPrograms({ user }) {
  const [programs, setPrograms] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [viewingProgram, setViewingProgram] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [programsData, claimsData] = await Promise.all([
        base44.entities.BenefitProgram.list('-created_date'),
        base44.entities.BenefitClaim.list('-created_date')
      ]);
      setPrograms(programsData || []);
      setClaims(claimsData || []);
    } catch (error) {
      console.error('Error loading benefit programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = () => {
    setEditingProgram(null);
    setShowForm(true);
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
    setShowForm(true);
  };

  const handleViewProgram = (program) => {
    setViewingProgram(program);
  };

  const handleArchiveProgram = async (program) => {
    if (!confirm('Are you sure you want to archive this benefit program?')) return;
    
    try {
      await base44.entities.BenefitProgram.update(program.id, {
        status: 'archived',
        archived_at: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      console.error('Error archiving program:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProgram(null);
    loadData();
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: <Badge className="bg-green-500">Active</Badge>,
      inactive: <Badge className="bg-gray-500">Inactive</Badge>,
      archived: <Badge className="bg-gray-400">Archived</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  const getProgramStats = (program) => {
    const programClaims = claims.filter(c => c.benefit_program_id === program.id);
    const activeClaims = programClaims.filter(c => 
      !['rejected', 'cancelled', 'disbursed'].includes(c.status)
    ).length;
    
    return {
      totalClaims: program.total_claims_processed || 0,
      activeClaims,
      totalDisbursed: program.total_amount_disbursed || 0,
      budgetUsed: program.budget_settings?.annual_budget 
        ? ((program.budget_settings.current_year_spent || 0) / program.budget_settings.annual_budget * 100).toFixed(1)
        : 0
    };
  };

  const filteredPrograms = programs.filter(p => {
    if (activeTab === 'active') return p.status === 'active';
    if (activeTab === 'inactive') return p.status === 'inactive';
    if (activeTab === 'archived') return p.status === 'archived';
    return true;
  });

  const activePrograms = programs.filter(p => p.status === 'active');
  const totalBudget = activePrograms.reduce((sum, p) => sum + (p.budget_settings?.annual_budget || 0), 0);
  const totalSpent = activePrograms.reduce((sum, p) => sum + (p.budget_settings?.current_year_spent || 0), 0);
  const totalClaims = claims.length;
  const pendingClaims = claims.filter(c => ['pending_review', 'pending_approval', 'under_review'].includes(c.status)).length;

  if (viewingProgram) {
    return (
      <BenefitProgramDetails
        program={viewingProgram}
        claims={claims.filter(c => c.benefit_program_id === viewingProgram.id)}
        onClose={() => setViewingProgram(null)}
        onEdit={() => {
          setEditingProgram(viewingProgram);
          setViewingProgram(null);
          setShowForm(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Benefit Programs</h1>
          <p className="text-gray-600 mt-1">Configure and manage member benefit programs</p>
        </div>
        <Button onClick={handleCreateProgram} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Program
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{activePrograms.length}</span>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{totalClaims}</span>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-gray-500 mt-2">{pendingClaims} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">${totalBudget.toLocaleString()}</span>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-sm text-gray-500 mt-2">${totalSpent.toLocaleString()} spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Budget Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
              </span>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs List */}
      <Card>
        <CardHeader>
          <CardTitle>Benefit Programs</CardTitle>
          <CardDescription>Manage your organization's benefit programs and entitlements</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active ({programs.filter(p => p.status === 'active').length})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({programs.filter(p => p.status === 'inactive').length})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({programs.filter(p => p.status === 'archived').length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading programs...</div>
              ) : filteredPrograms.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No {activeTab} benefit programs found. Create your first program to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {filteredPrograms.map(program => {
                    const stats = getProgramStats(program);
                    return (
                      <Card key={program.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold">{program.program_name}</h3>
                                {getStatusBadge(program.status)}
                                <Badge variant="outline" className="capitalize">
                                  {program.program_type?.replace('_', ' ')}
                                </Badge>
                              </div>
                              
                              <p className="text-gray-600 mb-4">{program.description}</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Total Claims</p>
                                  <p className="font-semibold text-lg">{stats.totalClaims}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Active Claims</p>
                                  <p className="font-semibold text-lg">{stats.activeClaims}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Total Disbursed</p>
                                  <p className="font-semibold text-lg">${stats.totalDisbursed.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Budget Used</p>
                                  <p className="font-semibold text-lg">{stats.budgetUsed}%</p>
                                </div>
                              </div>

                              {program.budget_settings?.annual_budget && (
                                <div className="mt-4">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Annual Budget</span>
                                    <span className="font-medium">
                                      ${(program.budget_settings.current_year_spent || 0).toLocaleString()} / ${program.budget_settings.annual_budget.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        stats.budgetUsed > 90 ? 'bg-red-500' : 
                                        stats.budgetUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.min(stats.budgetUsed, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewProgram(program)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditProgram(program)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              {program.status === 'active' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleArchiveProgram(program)}
                                >
                                  <Archive className="h-4 w-4 mr-1" />
                                  Archive
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <BenefitProgramForm
          program={editingProgram}
          onClose={handleFormClose}
          user={user}
        />
      )}
    </div>
  );
}