import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  DollarSign, Users, Activity, Target 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PredictiveAnalyticsPanel({ metrics }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Not enough data for predictive analytics
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'At Risk';
  };

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Association Health Score
          </CardTitle>
          <CardDescription>
            Overall financial and operational health indicator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-6xl font-bold ${getHealthColor(metrics.healthScore)}`}>
                {metrics.healthScore}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {getHealthLabel(metrics.healthScore)}
              </div>
            </div>
            <div className="text-right">
              {metrics.healthScore >= 80 && (
                <CheckCircle className="h-16 w-16 text-green-500" />
              )}
              {metrics.healthScore < 80 && metrics.healthScore >= 60 && (
                <AlertTriangle className="h-16 w-16 text-yellow-500" />
              )}
              {metrics.healthScore < 60 && (
                <AlertTriangle className="h-16 w-16 text-red-500" />
              )}
            </div>
          </div>
          <Progress value={metrics.healthScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Predictions Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Membership Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Membership Growth Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Growth Rate</span>
                <div className="flex items-center gap-2">
                  {metrics.avgGrowthRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`font-bold ${metrics.avgGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.avgGrowthRate >= 0 ? '+' : ''}{metrics.avgGrowthRate?.toFixed(1)} members/month
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {metrics.predictedMembers?.map((pred, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">{pred.month}</span>
                    <span className="text-lg font-bold text-blue-600">
                      {pred.predicted} members
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Churn Rate</span>
                  <Badge variant={metrics.churnRate > 10 ? 'destructive' : 'secondary'}>
                    {metrics.churnRate?.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Financial Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Projected Revenue</div>
                  <div className="text-lg font-bold text-green-600">
                    ${metrics.predictedMonthlyRevenue?.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Next month</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Monthly Burn Rate</div>
                  <div className="text-lg font-bold text-red-600">
                    ${metrics.monthlyBurnRate?.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Payouts + Expenses</div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${metrics.fundingGap > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Funding Gap Analysis</span>
                  {metrics.fundingGap > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${metrics.fundingGap > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {metrics.fundingGap > 0 ? '-' : '+'}${Math.abs(metrics.fundingGap)?.toFixed(2)}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {metrics.fundingGap > 0 
                    ? 'Additional funding needed per month' 
                    : 'Surplus per month'}
                </p>
              </div>

              <div className="pt-3 border-t">
                <div className="text-sm">
                  <span className="text-gray-600">Avg Contribution per Member: </span>
                  <span className="font-bold">${metrics.avgContributionPerMember?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Strategic Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.fundingGap > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Action Required:</strong> Your projected expenses exceed revenue by ${metrics.fundingGap.toFixed(2)}/month. 
                  Consider increasing member contributions or recruiting {Math.ceil(metrics.fundingGap / metrics.avgContributionPerMember)} more members.
                </AlertDescription>
              </Alert>
            )}

            {metrics.churnRate > 10 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>High Churn Alert:</strong> Your churn rate of {metrics.churnRate.toFixed(1)}% is above healthy levels. 
                  Focus on member engagement and satisfaction to reduce attrition.
                </AlertDescription>
              </Alert>
            )}

            {metrics.avgGrowthRate < 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Declining Membership:</strong> Membership is declining by {Math.abs(metrics.avgGrowthRate).toFixed(1)} members/month. 
                  Consider new member recruitment strategies and retention programs.
                </AlertDescription>
              </Alert>
            )}

            {metrics.healthScore >= 80 && metrics.fundingGap <= 0 && metrics.avgGrowthRate > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Excellent Performance:</strong> Your association is in strong financial health with positive growth. 
                  Continue current strategies and consider expanding services or benefits.
                </AlertDescription>
              </Alert>
            )}

            {metrics.predictedMonthlyRevenue > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Growth Opportunity</h4>
                <p className="text-sm text-blue-800">
                  With {metrics.predictedMembers?.[2]?.predicted} projected members in 3 months, 
                  you could generate ${(metrics.predictedMembers?.[2]?.predicted * metrics.avgContributionPerMember).toFixed(2)} 
                  in monthly revenue. Plan ahead for scaling operations.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Predicted Member Growth Chart */}
      {metrics.predictedMembers && (
        <Card>
          <CardHeader>
            <CardTitle>Membership Projection</CardTitle>
            <CardDescription>Predicted member count over the next 3 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.predictedMembers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="predicted" fill="#3B82F6" name="Predicted Members" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}