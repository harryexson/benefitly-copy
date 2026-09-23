import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, DollarSign, TrendingUp, PieChart, BarChart3, 
  Wallet, Calendar, Target, Activity, AlertCircle, Check
} from 'lucide-react';

const AVAILABLE_WIDGETS = [
  { id: 'membership_growth', name: 'Membership Growth', icon: Users, description: 'Track new and active members over time' },
  { id: 'revenue_chart', name: 'Revenue Analysis', icon: DollarSign, description: 'Revenue, payouts, and net income trends' },
  { id: 'payout_chart', name: 'Payout Analysis', icon: Wallet, description: 'Track benefit payouts over time' },
  { id: 'contribution_chart', name: 'Contribution Trends', icon: TrendingUp, description: 'Contribution collection patterns' },
  { id: 'expense_chart', name: 'Expense Breakdown', icon: PieChart, description: 'Expense categories and trends' },
  { id: 'collection_rate', name: 'Collection Rate', icon: Target, description: 'Payment collection efficiency' },
  { id: 'member_status', name: 'Member Status', icon: Activity, description: 'Active vs inactive members' },
  { id: 'health_score', name: 'Health Score', icon: AlertCircle, description: 'Overall association health metrics' },
  { id: 'event_summary', name: 'Event Summary', icon: Calendar, description: 'Events and contribution status' },
  { id: 'top_contributors', name: 'Top Contributors', icon: BarChart3, description: 'Most active contributing members' },
];

export default function WidgetSelector({ activeWidgets, onAddWidget, onClose }) {
  const activeIds = activeWidgets.map(w => w.id);
  
  return (
    <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Add Widget</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {AVAILABLE_WIDGETS.map(widget => {
            const isActive = activeIds.includes(widget.id);
            const Icon = widget.icon;
            
            return (
              <button
                key={widget.id}
                onClick={() => !isActive && onAddWidget(widget)}
                disabled={isActive}
                className={`
                  p-3 rounded-lg border-2 text-left transition-all
                  ${isActive 
                    ? 'border-green-300 bg-green-50 cursor-default' 
                    : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-600'}`} />
                  {isActive && <Check className="h-3 w-3 text-green-600" />}
                </div>
                <p className="text-sm font-medium truncate">{widget.name}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{widget.description}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export { AVAILABLE_WIDGETS };