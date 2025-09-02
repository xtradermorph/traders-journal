'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity,
  Smartphone,
  Touch,
  Responsive
} from 'lucide-react';

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }>;
}

interface MobileChartProps {
  data: ChartData;
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  description?: string;
  height?: number;
  className?: string;
}

export const MobileOptimizedChart: React.FC<MobileChartProps> = ({
  data,
  type,
  title,
  description,
  height = 300,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (canvasRef.current && data) {
      createChart();
    }
  }, [data, type]);

  const createChart = async () => {
    try {
      // Dynamically import Chart.js to reduce bundle size
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      if (canvasRef.current) {
        // Destroy existing chart
        if (chartInstance) {
          chartInstance.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const newChart = new Chart(ctx, {
            type,
            data,
            options: getChartOptions(),
          });

          setChartInstance(newChart);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to create chart:', error);
      setIsLoading(false);
    }
  };

  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          enabled: true,
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          padding: 12,
        },
      },
      scales: type !== 'pie' && type !== 'doughnut' ? {
        x: {
          display: true,
          grid: {
            display: false,
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: 10,
            },
          },
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
            font: {
              size: 10,
            },
          },
        },
      } : undefined,
    };

    return baseOptions;
  };

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 animate-pulse" />
              <p>Loading chart...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'line' && <TrendingUp className="h-5 w-5 text-blue-500" />}
          {type === 'bar' && <BarChart3 className="h-5 w-5 text-green-500" />}
          {type === 'pie' && <PieChart className="h-5 w-5 text-purple-500" />}
          {type === 'doughnut' && <Activity className="h-5 w-5 text-orange-500" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          <canvas
            ref={canvasRef}
            style={{
              touchAction: 'none', // Prevents default touch behaviors
              cursor: 'pointer',
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Mobile-optimized trading performance chart
export const MobileTradingPerformanceChart: React.FC<{
  performanceData: Array<{
    date: string;
    profitLoss: number;
    cumulative: number;
  }>;
  className?: string;
}> = ({ performanceData, className = '' }) => {
  const [timeframe, setTimeframe] = useState<'1W' | '1M' | '3M' | '1Y'>('1M');

  const chartData: ChartData = {
    labels: performanceData.map(d => d.date),
    datasets: [
      {
        label: 'Daily P&L',
        data: performanceData.map(d => d.profitLoss),
        backgroundColor: performanceData.map(d => 
          d.profitLoss >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
        ),
        borderColor: performanceData.map(d => 
          d.profitLoss >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 2,
      },
      {
        label: 'Cumulative P&L',
        data: performanceData.map(d => d.cumulative),
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 3,
        type: 'line',
      },
    ],
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Trading Performance
            </CardTitle>
            <CardDescription>Your trading performance over time</CardDescription>
          </div>
          <div className="flex gap-1">
            {(['1W', '1M', '3M', '1Y'] as const).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(tf)}
                className="text-xs px-2 py-1 h-8"
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <MobileOptimizedChart
          data={chartData}
          type="bar"
          title=""
          height={250}
        />
      </CardContent>
    </Card>
  );
};

// Mobile-optimized portfolio allocation chart
export const MobilePortfolioAllocationChart: React.FC<{
  allocationData: Array<{
    currency: string;
    percentage: number;
    value: number;
  }>;
  className?: string;
}> = ({ allocationData, className = '' }) => {
  const chartData: ChartData = {
    labels: allocationData.map(d => d.currency),
    datasets: [
      {
        label: 'Portfolio Allocation',
        data: allocationData.map(d => d.percentage),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
          '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-purple-500" />
          Portfolio Allocation
        </CardTitle>
        <CardDescription>Distribution of your trading capital</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-center">
            <MobileOptimizedChart
              data={chartData}
              type="doughnut"
              title=""
              height={200}
            />
          </div>
          <div className="space-y-2">
            {allocationData.map((item, index) => (
              <div key={item.currency} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: chartData.datasets[0].backgroundColor![index],
                    }}
                  />
                  <span className="font-medium">{item.currency}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{item.percentage.toFixed(1)}%</div>
                  <div className="text-sm text-gray-500">${item.value.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mobile-optimized win rate chart
export const MobileWinRateChart: React.FC<{
  winRateData: {
    wins: number;
    losses: number;
    total: number;
    winRate: number;
  };
  className?: string;
}> = ({ winRateData, className = '' }) => {
  const chartData: ChartData = {
    labels: ['Wins', 'Losses'],
    datasets: [
      {
        label: 'Trade Results',
        data: [winRateData.wins, winRateData.losses],
        backgroundColor: ['#10B981', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Win Rate Analysis
        </CardTitle>
        <CardDescription>Your trading success rate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-center">
            <MobileOptimizedChart
              data={chartData}
              type="pie"
              title=""
              height={200}
            />
          </div>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {winRateData.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Win Rate</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Trades:</span>
                <Badge variant="outline">{winRateData.total}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Winning Trades:</span>
                <Badge variant="default" className="bg-green-500">
                  {winRateData.wins}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Losing Trades:</span>
                <Badge variant="destructive">
                  {winRateData.losses}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mobile-optimized charts dashboard
export const MobileChartsDashboard: React.FC<{
  performanceData: any;
  allocationData: any;
  winRateData: any;
  className?: string;
}> = ({ performanceData, allocationData, winRateData, className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Smartphone className="h-4 w-4" />
        <span>Mobile-optimized charts</span>
        <Touch className="h-4 w-4" />
        <span>Touch-friendly</span>
        <Responsive className="h-4 w-4" />
        <span>Responsive design</span>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="winrate">Win Rate</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance" className="mt-4">
          <MobileTradingPerformanceChart
            performanceData={performanceData}
          />
        </TabsContent>
        
        <TabsContent value="allocation" className="mt-4">
          <MobilePortfolioAllocationChart
            allocationData={allocationData}
          />
        </TabsContent>
        
        <TabsContent value="winrate" className="mt-4">
          <MobileWinRateChart
            winRateData={winRateData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileOptimizedChart;
