import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, LineChartIcon, TrendingUp } from 'lucide-react';

const CHART_TYPES = [
  { value: 'area', label: 'Area', icon: TrendingUp },
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'line', label: 'Line', icon: LineChartIcon },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function InteractiveChart({ 
  title, 
  description,
  data = [], 
  dataKeys = [],
  xAxisKey = 'month',
  defaultChartType = 'area',
  onDrillDown,
  height = 300
}) {
  const [chartType, setChartType] = useState(defaultChartType);
  const [selectedDataKeys, setSelectedDataKeys] = useState(dataKeys.map(k => k.key));

  const toggleDataKey = (key) => {
    setSelectedDataKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleChartClick = (data) => {
    if (onDrillDown && data?.activePayload?.[0]) {
      onDrillDown(data.activePayload[0].payload);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.dataKey.includes('amount') || entry.dataKey.includes('revenue') || entry.dataKey.includes('payout') || entry.dataKey.includes('expense')
              ? `$${Number(entry.value).toLocaleString()}`
              : entry.value.toLocaleString()}
          </p>
        ))}
        {onDrillDown && (
          <p className="text-xs text-blue-600 mt-2 cursor-pointer">Click to drill down →</p>
        )}
      </div>
    );
  };

  const renderChart = () => {
    const activeDataKeys = dataKeys.filter(dk => selectedDataKeys.includes(dk.key));
    
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {activeDataKeys.map((dk, index) => (
              <Bar 
                key={dk.key}
                dataKey={dk.key} 
                name={dk.label}
                fill={dk.color || COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
      
      case 'line':
        return (
          <LineChart data={data} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {activeDataKeys.map((dk, index) => (
              <Line 
                key={dk.key}
                type="monotone"
                dataKey={dk.key} 
                name={dk.label}
                stroke={dk.color || COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
      
      case 'area':
      default:
        return (
          <AreaChart data={data} onClick={handleChartClick}>
            <defs>
              {activeDataKeys.map((dk, index) => (
                <linearGradient key={dk.key} id={`gradient-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={dk.color || COLORS[index % COLORS.length]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={dk.color || COLORS[index % COLORS.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {activeDataKeys.map((dk, index) => (
              <Area 
                key={dk.key}
                type="monotone"
                dataKey={dk.key} 
                name={dk.label}
                stroke={dk.color || COLORS[index % COLORS.length]}
                fill={`url(#gradient-${dk.key})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            {CHART_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  variant={chartType === type.value ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setChartType(type.value)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </div>
        
        {/* Data series toggles */}
        {dataKeys.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {dataKeys.map((dk, index) => (
              <button
                key={dk.key}
                onClick={() => toggleDataKey(dk.key)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-all
                  ${selectedDataKeys.includes(dk.key)
                    ? 'opacity-100'
                    : 'opacity-40'}
                `}
                style={{ 
                  backgroundColor: `${dk.color || COLORS[index % COLORS.length]}20`,
                  color: dk.color || COLORS[index % COLORS.length],
                  border: `1px solid ${dk.color || COLORS[index % COLORS.length]}`
                }}
              >
                {dk.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}