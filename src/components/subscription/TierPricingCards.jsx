
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Edit, ToggleLeft, ToggleRight, Star, Users, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TierPricingCards({ tiers, onEdit, onToggleActive, onDelete, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="relative">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getPopularTier = () => {
    // Mark the middle tier as popular, or the one with most features
    const sortedByPrice = tiers.filter(t => t.is_active).sort((a, b) => a.monthly_price - b.monthly_price);
    return sortedByPrice[Math.floor(sortedByPrice.length / 2)]?.id;
  };

  const popularTierId = getPopularTier();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {tiers.map((tier) => (
        <Card key={tier.id} className={`relative transition-all duration-200 hover:shadow-lg ${
          popularTierId === tier.id ? 'ring-2 ring-blue-500' : ''
        } ${!tier.is_active ? 'opacity-60' : ''}`}>
          {popularTierId === tier.id && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-blue-500 text-white flex items-center gap-1 px-3 py-1">
                <Star className="h-3 w-3" />
                Most Popular
              </Badge>
            </div>
          )}
          
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-xl font-bold">{tier.name}</CardTitle>
              <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                {tier.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="text-3xl font-bold text-blue-600">
                ${tier.monthly_price}
                <span className="text-base text-gray-500 font-normal">/month</span>
              </div>
              <div className="text-sm text-gray-500">
                ${tier.yearly_price}/year (save ${(tier.monthly_price * 12) - tier.yearly_price})
              </div>
              <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mt-2">
                <Users className="h-4 w-4" />
                Up to {tier.member_limit === 99999 ? 'unlimited' : tier.member_limit} members
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-900">Features included:</h4>
              <ul className="space-y-2">
                {tier.features?.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                )) || <li className="text-sm text-gray-500">No features listed</li>}
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  onClick={() => onEdit(tier)} 
                  className="w-full" 
                  variant="outline"
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => onDelete(tier.id)}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
              
              <Button
                onClick={() => onToggleActive(tier.id, tier.is_active)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {tier.is_active ? (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {tiers.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500">No subscription tiers found.</p>
        </div>
      )}
    </div>
  );
}
