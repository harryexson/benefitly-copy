import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function KPIWidget({ 
  title, 
  value, 
  previousValue,
  format = 'number',
  icon: Icon,
  trend,
  trendLabel,
  description,
  onClick,
  size = 'normal',
  color = 'blue'
}) {
  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';
    
    switch (format) {
      case 'currency':
        return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percent':
        return `${Number(val).toFixed(1)}%`;
      case 'number':
      default:
        return Number(val).toLocaleString();
    }
  };

  const calculateTrend = () => {
    if (trend !== undefined) return trend;
    if (previousValue === undefined || previousValue === 0) return 0;
    return ((value - previousValue) / previousValue) * 100;
  };

  const trendValue = calculateTrend();
  const trendDirection = trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral';

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  const iconBgClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
  };

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:border-blue-400"
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-4", size === 'compact' && "p-3")}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className={cn(
                "font-medium text-gray-500",
                size === 'compact' ? "text-xs" : "text-sm"
              )}>
                {title}
              </p>
              {description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className={cn(
              "font-bold text-gray-900",
              size === 'compact' ? "text-xl" : "text-3xl"
            )}>
              {formatValue(value)}
            </p>
            
            {(trendValue !== 0 || trendLabel) && (
              <div className="flex items-center gap-1 mt-2">
                {trendDirection === 'up' && (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                {trendDirection === 'down' && (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                {trendDirection === 'neutral' && (
                  <Minus className="h-4 w-4 text-gray-400" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  trendDirection === 'up' && "text-green-600",
                  trendDirection === 'down' && "text-red-600",
                  trendDirection === 'neutral' && "text-gray-500"
                )}>
                  {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-gray-500">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          
          {Icon && (
            <div className={cn(
              "rounded-lg p-2",
              iconBgClasses[color]
            )}>
              <Icon className={cn(
                size === 'compact' ? "h-5 w-5" : "h-6 w-6",
                `text-${color}-600`
              )} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}