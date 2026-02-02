import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, CheckCircle, AlertTriangle, DollarSign, 
  TrendingUp, ArrowRight, Zap, XCircle 
} from 'lucide-react';

export default function PayoutSummaryDashboard({ payouts, onTabChange, onSelectPayouts }) {
  const stats = {
    pending: payouts.filter(p => p.status === 'Pending Approval'),
    approved: payouts.filter(p => p.status === 'Approved'),
    failed: payouts.filter(p => p.status === 'Failed'),
    disbursed: payouts.filter(p => p.status === 'Disbursed'),
  };

  const pendingAmount = stats.pending.reduce((sum, p) => sum + p.amount, 0);
  const approvedAmount = stats.approved.reduce((sum, p) => sum + p.amount, 0);
  const failedAmount = stats.failed.reduce((sum, p) => sum + p.amount, 0);
  const disbursedAmount = stats.disbursed.reduce((sum, p) => sum + p.amount, 0);

  const needsAttention = stats.pending.length + stats.approved.length + stats.failed.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Pending Approval */}
      <Card className={`border-l-4 ${stats.pending.length > 0 ? 'border-l-yellow-500' : 'border-l-gray-200'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Approval
            </span>
            {stats.pending.length > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {stats.pending.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            ${pendingAmount.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.pending.length} payout{stats.pending.length !== 1 ? 's' : ''} awaiting review
          </p>
          {stats.pending.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 w-full"
              onClick={() => onTabChange('pending_approval')}
            >
              Review Now
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Ready to Process */}
      <Card className={`border-l-4 ${stats.approved.length > 0 ? 'border-l-blue-500' : 'border-l-gray-200'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Ready to Process
            </span>
            {stats.approved.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {stats.approved.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            ${approvedAmount.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.approved.length} approved, awaiting disbursement
          </p>
          {stats.approved.length > 0 && (
            <Button 
              size="sm" 
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                onSelectPayouts(stats.approved.map(p => p.id));
                onTabChange('approved');
              }}
            >
              <Zap className="h-3 w-3 mr-1" />
              Process All
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Failed - Needs Attention */}
      <Card className={`border-l-4 ${stats.failed.length > 0 ? 'border-l-red-500' : 'border-l-gray-200'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Failed
            </span>
            {stats.failed.length > 0 && (
              <Badge variant="destructive">
                {stats.failed.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            ${failedAmount.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.failed.length > 0 
              ? `${stats.failed.length} payout${stats.failed.length !== 1 ? 's' : ''} need attention`
              : 'No failed payouts'
            }
          </p>
          {stats.failed.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 w-full border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => onTabChange('failed')}
            >
              <XCircle className="h-3 w-3 mr-1" />
              View Issues
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Successfully Disbursed */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Disbursed
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {stats.disbursed.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${disbursedAmount.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total successfully paid out
          </p>
          <div className="flex items-center gap-1 mt-3 text-xs text-green-600">
            <TrendingUp className="h-3 w-3" />
            <span>All time disbursements</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}