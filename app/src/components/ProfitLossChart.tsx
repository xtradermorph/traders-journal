'use client'

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { cn } from "@/lib/utils";
import type { Trade } from '@/types/trade';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProfitLossChartProps {
  trades: Trade[] | null;
  isLoading: boolean;
}

const ProfitLossChart = ({ trades, isLoading }: ProfitLossChartProps) => {
  const [timeRange, setTimeRange] = useState("7");
  
  // Format date for display based on time range
  const formatDate = (date: string) => {
    const days = parseInt(timeRange);
    
    // For longer periods, show month/year format
    if (days >= 180) { // 6 months or more
      return new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        year: '2-digit'
      });
    }
    
    // For shorter periods, show month/day format
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Process trades data for the chart
  const getChartData = () => {
    if (!trades || trades.length === 0) return null;
    
    // Calculate max days to look back based on selected time range
    const days = parseInt(timeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Create a date-based map to store profit/loss by date
    const dateMap = new Map();
    
    // For longer periods, group by month instead of individual days
    const isLongPeriod = days >= 180; // 6 months or more
    
    if (isLongPeriod) {
      // Initialize with months for the selected range
      for (let i = 0; i < days; i += 30) { // Group by months (approximately 30 days)
        const date = new Date();
        date.setDate(date.getDate() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        dateMap.set(monthKey, 0);
      }
    } else {
      // Initialize with dates for the selected range (daily)
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap.set(dateStr, 0);
      }
    }
    
    // Populate with actual trade data
    trades.forEach(trade => {
      const tradeDate = new Date(trade.date);
      
      if (tradeDate >= cutoffDate) {
        if (isLongPeriod) {
          // Group by month for longer periods
          const monthKey = tradeDate.toISOString().slice(0, 7); // YYYY-MM format
          const currentValue = dateMap.get(monthKey) || 0;
          dateMap.set(monthKey, currentValue + (trade.profit_loss || 0));
        } else {
          // Daily grouping for shorter periods
          const dateStr = tradeDate.toISOString().split('T')[0];
          const currentValue = dateMap.get(dateStr) || 0;
          dateMap.set(dateStr, currentValue + (trade.profit_loss || 0));
        }
      }
    });
    
    // Convert to chart data format (sorted by date, most recent last)
    const sortedDates = Array.from(dateMap.keys()).sort();
    
    // Use bright, vibrant colors for better visibility
    const profitColor = '#10B981'; // Bright green
    const lossColor = '#EF4444';   // Bright red
    
    return {
      labels: sortedDates.map(formatDate),
      datasets: [
        {
          label: 'Profit/Loss',
          data: sortedDates.map(date => dateMap.get(date)),
          backgroundColor: sortedDates.map(date => 
            dateMap.get(date) >= 0 
              ? `${profitColor}CC` // Bright green with 80% opacity for profit
              : `${lossColor}CC`   // Bright red with 80% opacity for loss
          ),
          borderColor: sortedDates.map(date => 
            dateMap.get(date) >= 0 
              ? profitColor
              : lossColor
          ),
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  };
  
  const chartData = getChartData();
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              const value = context.parsed.y;
              label += value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value;
          },
          color: '#6B7280',
          font: {
            size: 11,
            weight: 400
          }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.2)',
          lineWidth: 1
        },
        border: {
          color: 'rgba(107, 114, 128, 0.3)'
        }
      },
      x: {
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
            weight: 400
          }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          lineWidth: 1
        },
        border: {
          color: 'rgba(107, 114, 128, 0.3)'
        }
      }
    },
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-foreground">Profit/Loss Over Time</h3>
          <div className="flex items-center space-x-2">
            <Select
              value={timeRange}
              onValueChange={setTimeRange}
            >
              <SelectTrigger className="text-xs h-8 w-[130px]">
                <SelectValue placeholder="Last 7 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last 1 year</SelectItem>
                <SelectItem value="1095">Last 3 years</SelectItem>
                <SelectItem value="1825">Last 5 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="h-64 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !chartData ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              No data available for the selected period
            </div>
          ) : (
            <>
              <Bar data={chartData} options={options} />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                {new Date().getFullYear()}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossChart;
