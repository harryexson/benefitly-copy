
import React, { useState, useEffect } from 'react';
import { AssociationAccount, SubscriptionTier, User } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, AlertTriangle, DollarSign, Users, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientAccountsTable from '../components/backoffice/ClientAccountsTable';
import ClientAccountForm from '../components/backoffice/ClientAccountForm';
import SuspensionDialog from '../components/backoffice/SuspensionDialog';
import EnterpriseContractManager from '../components/backoffice/EnterpriseContractManager'; // Import the new component
import { toast } from 'sonner';

export default function BackOffice() {
  const [accounts, setAccounts] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSuspensionOpen, setIsSuspensionOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [suspendingAccount, setSuspendingAccount] = useState(null);
  const [managingEnterpriseAccount, setManagingEnterpriseAccount] = useState(null); // New state for enterprise dialog
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      await User.me(); // Auth check
      const [accountList, tierList] = await Promise.all([
        AssociationAccount.list('-created_date'),
        SubscriptionTier.list()
      ]);
      setAccounts(accountList);
      setTiers(tierList);
    } catch (error) {
      if (error.name === 'CanceledError' || (error.message && error.message.includes('aborted'))) {
        console.log('Data fetch for BackOffice aborted.');
      } else {
        console.error("Authentication failed or data fetch error:", error);
        toast.error("You are not authorized to view this page.");
        setAccounts([]);
        setTiers([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();
  }, []);

  const handleOpenForm = (account = null) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingAccount(null);
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    await loadData();
    handleCloseForm();
  };
  
  const handleOpenSuspension = (account) => {
    setSuspendingAccount(account);
    setIsSuspensionOpen(true);
  };

  const handleCloseSuspension = () => {
    setSuspendingAccount(null);
    setIsSuspensionOpen(false);
  };
  
  const handleSuspend = async () => {
    await loadData();
    handleCloseSuspension();
  };

  const handleOpenEnterpriseManager = (account) => {
    setManagingEnterpriseAccount(account);
  };

  const handleCloseEnterpriseManager = () => {
    setManagingEnterpriseAccount(null);
  };

  const filteredAccounts = accounts.filter(account => 
    (account.organization_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (account.point_of_contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (account.contact_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const stats = {
    total: accounts.length,
    active: accounts.filter(a => a.account_status === 'active').length,
    trial: accounts.filter(a => a.account_status === 'trial').length,
    suspended: accounts.filter(a => a.account_status === 'suspended').length
  };

  if (isLoading) {
    return <div>Loading Back Office...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Client Account Management</h2>
          <p className="text-gray-500">Manage all association accounts on the platform.</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          New Account
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Trial</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspended}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search accounts by name or email..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ClientAccountsTable
        accounts={filteredAccounts}
        tiers={tiers}
        onEdit={handleOpenForm}
        onSuspend={handleOpenSuspension}
        onManageEnterprise={handleOpenEnterpriseManager} // Pass handler
        onReactivate={async (id) => { await AssociationAccount.update(id, { account_status: 'active' }); await loadData(); toast.success('Account reactivated'); }}
        onDelete={async (id, name) => { if(confirm(`Are you sure you want to delete ${name}?`)) { await AssociationAccount.delete(id); await loadData(); toast.success('Account deleted'); } }}
        isLoading={isLoading}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Create New Account'}</DialogTitle>
          </DialogHeader>
          <ClientAccountForm
            account={editingAccount}
            tiers={tiers}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
      
      <SuspensionDialog 
        account={suspendingAccount}
        isOpen={isSuspensionOpen}
        onClose={handleCloseSuspension}
        onConfirm={handleSuspend}
      />

      <Dialog open={!!managingEnterpriseAccount} onOpenChange={handleCloseEnterpriseManager}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Enterprise Contract</DialogTitle>
          </DialogHeader>
          {managingEnterpriseAccount && (
            <EnterpriseContractManager
              account={managingEnterpriseAccount}
              onCancel={handleCloseEnterpriseManager}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
