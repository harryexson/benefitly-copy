import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Calendar } from 'lucide-react';

export default function FinancialSummaryCards({ 
  totalContributed, 
  totalPayoutsReceived, 
  outstandingBalance, 
  upcomingPayments,
  contributionCount,
  payoutCount 
}) {
  const netBalance = totalPayoutsReceived - totalContributed;
  const isPositive = netBalance >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Contributed */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Contributed</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                ${totalContributed.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {contributionCount} payment{contributionCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Received */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Received</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                ${totalPayoutsReceived.toFixed(2)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {payoutCount} payout{payoutCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Balance */}
      <Card className={`bg-gradient-to-br ${isPositive ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-slate-50 to-slate-100 border-slate-200'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-slate-600'}`}>
                Net Balance
              </p>
              <p className={`text-3xl font-bold mt-2 ${isPositive ? 'text-emerald-900' : 'text-slate-900'}`}>
                {isPositive ? '+' : ''}${Math.abs(netBalance).toFixed(2)}
              </p>
              <p className={`text-xs mt-1 ${isPositive ? 'text-emerald-600' : 'text-slate-600'}`}>
                {isPositive ? 'Net benefit received' : 'Net contributed'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPositive ? 'bg-emerald-200' : 'bg-slate-200'}`}>
              <DollarSign className={`h-6 w-6 ${isPositive ? 'text-emerald-600' : 'text-slate-600'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Balance */}
      <Card className={`bg-gradient-to-br ${outstandingBalance > 0 ? 'from-orange-50 to-orange-100 border-orange-200' : 'from-gray-50 to-gray-100 border-gray-200'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${outstandingBalance > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                Outstanding Balance
              </p>
              <p className={`text-3xl font-bold mt-2 ${outstandingBalance > 0 ? 'text-orange-900' : 'text-gray-900'}`}>
                ${outstandingBalance.toFixed(2)}
              </p>
              <p className={`text-xs mt-1 ${outstandingBalance > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                {upcomingPayments} upcoming payment{upcomingPayments !== 1 ? 's' : ''}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${outstandingBalance > 0 ? 'bg-orange-200' : 'bg-gray-200'}`}>
              {outstandingBalance > 0 ? (
                <AlertCircle className="h-6 w-6 text-orange-600" />
              ) : (
                <Calendar className="h-6 w-6 text-gray-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}