import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ContributionGoalTracker({ member, contributions }) {
  const currentYear = new Date().getFullYear();
  const goalYear = member.contribution_goal_year || currentYear;
  const annualGoal = member.annual_contribution_goal || 0;
  
  // Calculate contributions for the goal year
  const yearContributions = contributions.filter(c => {
    if (c.status !== 'Paid' || !c.paid_at) return false;
    const paidYear = new Date(c.paid_at).getFullYear();
    return paidYear === goalYear;
  });
  
  const totalPaid = yearContributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
  const progressPercentage = annualGoal > 0 ? Math.min((totalPaid / annualGoal) * 100, 100) : 0;
  const remaining = Math.max(annualGoal - totalPaid, 0);
  
  if (!annualGoal || annualGoal === 0) {
    return null;
  }
  
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Contribution Goal {goalYear}</CardTitle>
          </div>
          {progressPercentage >= 100 && (
            <Badge className="bg-green-600 text-white">Goal Achieved! 🎉</Badge>
          )}
        </div>
        <CardDescription>Track your progress towards your annual giving goal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold text-blue-600">{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">${totalPaid.toFixed(2)}</div>
            <div className="text-xs text-gray-600">Contributed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">${annualGoal.toFixed(2)}</div>
            <div className="text-xs text-gray-600">Goal</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">${remaining.toFixed(2)}</div>
            <div className="text-xs text-gray-600">Remaining</div>
          </div>
        </div>
        
        {progressPercentage >= 100 && (
          <div className="p-3 bg-green-100 rounded-lg border border-green-300">
            <div className="flex items-center gap-2 text-green-900">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-semibold">
                Congratulations! You've exceeded your goal by ${(totalPaid - annualGoal).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}