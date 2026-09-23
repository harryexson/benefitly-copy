
import React, { useState, useEffect } from 'react';
import { SubscriptionTier, User } from '@/entities/all'; // Added User to imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubscriptionTiersTable from '../components/subscription/SubscriptionTiersTable';
import SubscriptionTierForm from '../components/subscription/SubscriptionTierForm';
import TierPricingCards from '../components/subscription/TierPricingCards';
import { toast } from 'sonner';

export default function SubscriptionTiers() {
  const [tiers, setTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Refactored loadTiers to accept an AbortSignal, allowing it to be called from both useEffect (with signal) and other handlers (without signal)
  const loadTiers = async (signal = null) => {
    setIsLoading(true);
    try {
      // Assuming User.me accepts an options object with a signal
      await User.me(signal ? { signal } : undefined);
      // Assuming SubscriptionTier.list accepts an optional second argument for options which includes signal
      const tierList = await SubscriptionTier.list('member_limit', signal ? { signal } : undefined);
      setTiers(tierList);
    } catch (error) {
      // Check if the error is due to an aborted request
      if (signal && signal.aborted || error.name === 'CanceledError' || (error.message && error.message.includes('aborted'))) {
        console.log('Data fetch for SubscriptionTiers page aborted.');
      } else {
        console.error("Failed to load subscription tiers", error);
        toast.error("Failed to load subscription tiers.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    loadTiers(signal); // Call the shared loadTiers function with the signal

    // Cleanup function to abort the request if the component unmounts
    return () => {
      abortController.abort();
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  const handleOpenForm = (tier = null) => {
    setEditingTier(tier);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTier(null);
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    // When saving, we want to reload tiers. This call does not need to be aborted by component unmount.
    // It will run to completion. So, we call loadTiers without a signal.
    await loadTiers();
    handleCloseForm();
  };

  const handleToggleActive = async (tierId, currentStatus) => {
    await SubscriptionTier.update(tierId, { is_active: !currentStatus });
    await loadTiers();
  };

  const handleDelete = async (tierId) => {
    if (window.confirm('Are you sure you want to delete this subscription tier? This action cannot be undone.')) {
      try {
        await SubscriptionTier.delete(tierId);
        toast.success('Subscription tier deleted successfully.');
        await loadTiers();
      } catch (error) {
        toast.error('Failed to delete subscription tier. It may be in use by an association account.');
        console.error("Deletion failed:", error);
      }
    }
  };

  const filteredTiers = tiers.filter(tier =>
    tier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTiers = tiers.filter(t => t.is_active);
  // Ensure that monthly_price is treated as a number, defaulting to 0 if null/undefined
  const totalMRR = activeTiers.reduce((sum, tier) => sum + (tier.monthly_price || 0), 0);
  const averagePrice = activeTiers.length > 0 ? totalMRR / activeTiers.length : 0;

  // For highest tier and member limit range, ensure activeTiers is not empty
  const highestPrice = activeTiers.length > 0 ? Math.max(...activeTiers.map(t => t.monthly_price || 0)) : 0;
  const minMemberLimit = activeTiers.length > 0 ? Math.min(...activeTiers.map(t => t.member_limit || 0)) : 0;
  const maxMemberLimit = activeTiers.length > 0 ? Math.max(...activeTiers.map(t => t.member_limit || 0)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Tiers</h2>
          <p className="text-gray-500">Manage pricing tiers and subscription plans for your platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search tiers..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              Table
            </Button>
          </div>
          <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            New Tier
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tiers.length}</div>
            <p className="text-xs text-green-600 mt-1">{activeTiers.length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Average Monthly Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averagePrice.toFixed(0)}</div>
            <p className="text-xs text-gray-500 mt-1">Across active tiers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Highest Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${highestPrice}
            </div>
            <p className="text-xs text-gray-500 mt-1">Monthly price</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Member Limit Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {minMemberLimit} - {maxMemberLimit}
            </div>
            <p className="text-xs text-gray-500 mt-1">Member limits</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Area */}
      {viewMode === 'cards' ? (
        <TierPricingCards 
          tiers={filteredTiers}
          onEdit={handleOpenForm}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      ) : (
        <SubscriptionTiersTable 
          tiers={filteredTiers}
          onEdit={handleOpenForm}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit Subscription Tier' : 'Create New Subscription Tier'}</DialogTitle>
            <DialogDescription>
              {editingTier ? 'Update the details for this subscription tier.' : 'Define a new subscription tier with pricing and features.'}
            </DialogDescription>
          </DialogHeader>
          <SubscriptionTierForm
            tier={editingTier}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
