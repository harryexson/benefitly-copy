import React, { useState, useEffect } from 'react';
import { SubscriptionTier } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

const commonFeatures = [
  "Basic member management",
  "Event creation and management", 
  "Payment processing",
  "Standard reporting",
  "Email notifications",
  "Advanced reporting",
  "Custom email templates",
  "Priority support",
  "Multi-admin access",
  "API access",
  "Custom branding",
  "Dedicated support",
  "White-label solution",
  "Custom integrations",
  "24/7 phone support",
  "Unlimited storage",
  "Advanced analytics",
  "Multi-language support"
];

export default function SubscriptionTierForm({ tier, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    member_limit: '',
    monthly_price: '',
    yearly_price: '',
    features: [],
    is_active: true
  });
  const [newFeature, setNewFeature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tier) {
      setFormData({
        name: tier.name || '',
        member_limit: tier.member_limit || '',
        monthly_price: tier.monthly_price || '',
        yearly_price: tier.yearly_price || '',
        features: tier.features || [],
        is_active: tier.is_active !== false
      });
    } else {
      // Reset form for new tier
      setFormData({
        name: '',
        member_limit: '',
        monthly_price: '',
        yearly_price: '',
        features: [],
        is_active: true
      });
    }
  }, [tier]);

  const handleChange = (e) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: type === 'number' ? (value === '' ? '' : Number(value)) : value 
    }));
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleAddCustomFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }));
  };

  const calculateYearlyPrice = () => {
    if (formData.monthly_price) {
      const monthly = Number(formData.monthly_price);
      const yearlyWithDiscount = Math.round(monthly * 12 * 0.83); // ~17% discount
      setFormData(prev => ({ ...prev, yearly_price: yearlyWithDiscount }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...formData,
        member_limit: Number(formData.member_limit),
        monthly_price: Number(formData.monthly_price),
        yearly_price: Number(formData.yearly_price)
      };
      
      if (tier && tier.id) {
        await SubscriptionTier.update(tier.id, dataToSave);
      } else {
        await SubscriptionTier.create(dataToSave);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save subscription tier:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Tier Name</Label>
          <Input id="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member_limit">Member Limit</Label>
          <Input 
            id="member_limit" 
            type="number" 
            value={formData.member_limit} 
            onChange={handleChange} 
            required 
            placeholder="e.g., 100 or 99999 for unlimited"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monthly_price">Monthly Price ($)</Label>
          <Input 
            id="monthly_price" 
            type="number" 
            step="0.01" 
            value={formData.monthly_price} 
            onChange={handleChange} 
            onBlur={calculateYearlyPrice}
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearly_price">Yearly Price ($)</Label>
          <div className="flex gap-2">
            <Input 
              id="yearly_price" 
              type="number" 
              step="0.01" 
              value={formData.yearly_price} 
              onChange={handleChange} 
              required 
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={calculateYearlyPrice}
              disabled={!formData.monthly_price}
            >
              Auto
            </Button>
          </div>
          {formData.monthly_price && formData.yearly_price && (
            <p className="text-xs text-green-600">
              Saves ${(formData.monthly_price * 12) - formData.yearly_price} per year
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Features</Label>
        
        {/* Selected Features */}
        {formData.features.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50">
            {formData.features.map((feature) => (
              <Badge key={feature} variant="secondary" className="flex items-center gap-1">
                {feature}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemoveFeature(feature)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Common Features Selection */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600">Select from common features:</Label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3">
            {commonFeatures.map((feature) => (
              <div key={feature} className="flex items-center space-x-2">
                <Checkbox
                  id={`feature-${feature}`}
                  checked={formData.features.includes(feature)}
                  onCheckedChange={() => handleFeatureToggle(feature)}
                />
                <Label 
                  htmlFor={`feature-${feature}`} 
                  className="text-sm cursor-pointer"
                >
                  {feature}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Add Custom Feature */}
        <div className="flex gap-2">
          <Input
            placeholder="Add custom feature..."
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomFeature())}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            onClick={handleAddCustomFeature}
            disabled={!newFeature.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Active (visible to customers)</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Tier'}
        </Button>
      </div>
    </form>
  );
}