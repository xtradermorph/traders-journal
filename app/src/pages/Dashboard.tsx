"use client"

import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import PerfSummaryCard from "@/components/PerfSummaryCard";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import ProfitLossChart from "@/components/ProfitLossChart";
import CurrencyPairPerformance from "@/components/CurrencyPairPerformance";
import { RecentTrades } from "@/components/RecentTrades";
import TradingWorkflowGuide from "@/components/TradingWorkflowGuide";
import TDAHistory from "@/components/TDAHistory";
import TradeCalendar from "@/components/TradeCalendar";
import AITradingInsights from "@/components/AITradingInsights";
import { CalendarCheck, Timer, TrendingUp, PercentCircle } from "lucide-react";

import type { Trade } from '@/types/trade';
import { useAuth } from '@/hooks/useAuth';
import { processTrades, filterTradesByCurrentWeek, calculateDashboardStats } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import DashboardFooter from '@/components/DashboardFooter';

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Stats {
  winRate: number;
  totalProfit: number;
  avgTradeProfit: number;
  riskRewardRatio: number;
  [key: string]: number | undefined;
}

const Dashboard = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [performanceView, setPerformanceView] = useState<'total' | 'currentWeek'>('total');
  const [toggleLoading, setToggleLoading] = useState(false);
  
  // Add query to fetch user profile data
  const { data: userProfile, isLoading: isLoadingProfile, error: userProfileError, refetch: refetchUserProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user) {
        return null;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Dashboard - Profile fetch error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user && !authLoading,
    initialData: null
  });

  // Fetch user settings including performance view preference
  const { data: userSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: async () => {
      if (!user) return { recent_trades_count: 5, performance_view: 'total' };
      const { data, error } = await supabase
        .from('user_settings')
        .select('recent_trades_count, performance_view')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Dashboard - Settings fetch error:', error);
        throw error;
      }
      return (data ?? { recent_trades_count: 5, performance_view: 'total' }) as {
        recent_trades_count?: number;
        performance_view?: 'total' | 'currentWeek';
      };
    },
    enabled: !!user && !authLoading,
    initialData: { recent_trades_count: 5, performance_view: 'total' },
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
    staleTime: 0 // Always consider data stale
  });

  // Update performance view when settings are loaded
  useEffect(() => {
    if (userSettings?.performance_view) {
      setPerformanceView(userSettings.performance_view as "total" | "currentWeek");
    }
  }, [userSettings?.performance_view]);

  // Force refetch settings when user changes or component mounts
  useEffect(() => {
    if (user && !authLoading) {
      refetchSettings();
    }
  }, [user, authLoading, refetchSettings]);

  // Listen for settings changes when returning from settings page
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'performance_view_updated') {
        refetchSettings();
      }
    };

    const handleFocus = () => {
      // Refetch settings when user returns to the page
      refetchSettings();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refetch settings when page becomes visible
        refetchSettings();
      }
    };

    const handlePerformanceViewChange = (e: CustomEvent) => {
      if (e.detail?.newView) {
        setPerformanceView(e.detail.newView);
      }
      refetchSettings();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('performanceViewChanged', handlePerformanceViewChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('performanceViewChanged', handlePerformanceViewChange as EventListener);
    };
  }, [refetchSettings]);

  // Function to save performance view preference
  const savePerformanceView = async (view: 'total' | 'currentWeek') => {
    // For now, just update local state to test the toggle
    setPerformanceView(view);
    setToggleLoading(true);
    
    if (!user) {
      setToggleLoading(false);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          performance_view: view,
          recent_trades_count: userSettings?.recent_trades_count || 5
        });
      
      if (error) {
        console.error('Error saving performance view:', error);
        // If database save fails, we still keep the local state change
      } else {
        // Update local state and refetch settings
        refetchSettings();
        // Notify other tabs/pages about the change
        if (typeof window !== 'undefined') {
          localStorage.setItem('performance_view_updated', Date.now().toString());
        }
      }
    } catch (error) {
      console.error('Error saving performance view:', error);
      // If database save fails, we still keep the local state change
    } finally {
      setToggleLoading(false);
    }
  };

  // Manual trigger to ensure userProfile is fetched
  useEffect(() => {
    if (user && !authLoading && !userProfile) {
      refetchUserProfile();
    }
  }, [user, authLoading, userProfile, refetchUserProfile]);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stats')
        .select('*')
        .single();
      
      if (error) throw error;
      return (data ?? {
        winRate: 0,
        totalProfit: 0,
        avgTradeProfit: 0,
        riskRewardRatio: 0
      }) as Stats;
    },
    initialData: {
      winRate: 0,
      totalProfit: 0,
      avgTradeProfit: 0,
      riskRewardRatio: 0
    } as Stats
  });
  
  const { data: trades, isLoading: isLoadingTrades, refetch } = useQuery({
    queryKey: ["trades", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
    enabled: !!user && !authLoading,
    initialData: [] as Trade[]
  });

  // Get total count of completed TDA analyses for View All button
  const { data: tdaCount } = useQuery({
    queryKey: ['tda-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('top_down_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'COMPLETED');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !authLoading
  });

  // Function to refresh trades data
  const refreshTrades = () => {
    queryClient.invalidateQueries({ queryKey: ['trades'] });
  };

  // Filter trades based on selected view
  const filteredTrades = performanceView === 'currentWeek' 
    ? filterTradesByCurrentWeek(trades || [])
    : trades || [];
  
  const statsData = calculateDashboardStats(filteredTrades);
  
  // Assign month-based numbers to all trades (matching Trade Records logic)
  const processedTrades = (() => {
    if (!trades || trades.length === 0) return [];
    // Group by month and assign numbers as in Trade Records
    const groupedByMonth: Record<string, Trade[]> = {};
    trades.forEach(trade => {
      const tradeDate = new Date(trade.date);
      const monthYear = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
      if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = [];
      groupedByMonth[monthYear].push(trade);
    });
    let processed: any[] = [];
    Object.values(groupedByMonth).forEach(monthTrades => {
      // Sort by date ascending, then by entry_time, then by created_at
      const sorted = [...monthTrades].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        if (a.entry_time && b.entry_time) return a.entry_time.localeCompare(b.entry_time);
        if (a.created_at && b.created_at) return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return 0;
      });
      sorted.forEach((trade, idx) => {
        processed.push({ ...trade, month_trade_number: idx + 1 });
      });
    });
    return processed;
  })();
  // Sort by date descending (newest first), then take the most recent N
  const recentProcessedTrades = processedTrades
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      if (b.entry_time && a.entry_time) return b.entry_time.localeCompare(a.entry_time);
      if (b.created_at && a.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    })
    .slice(0, userSettings?.recent_trades_count || 5);

  useEffect(() => {
    if (user && !authLoading) {
      refetch();
    }
  }, [user, authLoading, refetch]);

  return (
    <div className="w-full max-w-[98vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-2 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-2 sm:my-6 md:my-8 flex flex-col min-h-[80vh]">

      {/* Trading Workflow Guide */}
      <TradingWorkflowGuide />

      {/* Performance View Toggle */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h3 className="text-base sm:text-lg font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/30 text-white shadow-sm">Performance Summary</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <div 
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                  performanceView === 'currentWeek' 
                    ? "bg-yellow-400/20 border-yellow-400/30" 
                    : "bg-white/20 border-white/30",
                  toggleLoading && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => {
                  if (toggleLoading) return;
                  const newView = performanceView === 'currentWeek' ? 'total' : 'currentWeek';
                  savePerformanceView(newView);
                }}
              >
                <div className={cn(
                  "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                  performanceView === 'currentWeek' ? "translate-x-5" : "translate-x-0",
                  toggleLoading && "animate-pulse"
                )} />
              </div>
              <Label 
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  toggleLoading && "opacity-50 cursor-not-allowed"
                )} 
                onClick={() => {
                  if (toggleLoading) return;
                  const newView = performanceView === 'currentWeek' ? 'total' : 'currentWeek';
                  savePerformanceView(newView);
                }}
              >
                {performanceView === 'currentWeek' ? 'Current Week' : 'Total'}
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary Cards */}
      {filteredTrades && filteredTrades.length >= 3 ? (
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Avg. Trades/Day */}
        <PerfSummaryCard
          title="Avg. Trades/Day"
          value={statsData.hasData ? statsData.avgTradesPerDay.toFixed(2) : "0"}
          icon="lucide lucide-calendar-check"
          variant="primary"
          change={undefined}
          isLoading={isLoadingTrades}
          valueColor={
            statsData.avgTradesPerDay < 3 ? "text-green-500" :
            statsData.avgTradesPerDay === 3 ? "text-yellow-500" :
            statsData.avgTradesPerDay > 3 ? "text-red-500" : ""
          }
          iconWarning={statsData.avgTradesPerDay > 3}
        />
        {/* 2. Avg. Time in Trade */}
        <PerfSummaryCard
          title="Avg. Time in Trade"
          value={statsData.hasData ? `${statsData.avgTimeInTrade.toFixed(1)} min` : "0 min"}
          icon="lucide lucide-timer"
          variant="secondary"
          change={undefined}
          isLoading={isLoadingTrades}
        />
        {/* 3. Avg. Positive Pips */}
        <PerfSummaryCard
          title="Avg. Positive Pips"
          value={statsData.hasData ? statsData.avgPositivePips.toFixed(1) : "0"}
          icon="lucide lucide-trending-up"
          variant="accent"
          change={undefined}
          isLoading={isLoadingTrades}
        />
        {/* 4. % Positive Trades (highlighted) */}
        <PerfSummaryCard
          title="% Positive Trades"
          value={statsData.hasData ? `${statsData.percentPositiveTrades.toFixed(1)}%` : "0%"}
          icon="lucide lucide-percent-circle"
          variant="accent"
          change={undefined}
          isLoading={isLoadingTrades}
          valueColor={
            statsData.percentPositiveTrades <= 20 ? "text-red-500" :
            statsData.percentPositiveTrades <= 50 ? "text-yellow-500" :
            statsData.percentPositiveTrades <= 60 ? "text-yellow-300" :
            statsData.percentPositiveTrades <= 70 ? "text-green-500" :
            statsData.percentPositiveTrades > 70 ? "text-yellow-400" : ""
          }
          highlight={statsData.percentPositiveTrades > 70}
          cardHighlight={true}
          iconWarning={statsData.percentPositiveTrades <= 20}
        />
      </div>
      ) : (
        <div className="bg-muted/60 border border-muted rounded-lg p-4 sm:p-6 flex flex-col items-center justify-center text-center max-w-xl mx-auto shadow-sm mb-4">
          <strong className="text-sm sm:text-base text-foreground">
            {performanceView === 'currentWeek' 
              ? 'Add at least 3 trades this week to unlock your weekly performance summary!' 
              : 'Add at least 3 trades to unlock your performance summary!'}
          </strong>
          <span className="mt-2 text-xs sm:text-sm text-muted-foreground">
            {performanceView === 'currentWeek' 
              ? 'Once you have 3 or more trades this week, your dashboard will display detailed weekly performance statistics and insights.'
              : 'Once you have 3 or more trades, your dashboard will display detailed performance statistics and insights.'}
          </span>
        </div>
      )}

      {/* Performance Analysis */}
      <div className="mt-6 sm:mt-8">
        <h3 className="text-base sm:text-lg font-semibold gradient-heading mb-3 sm:mb-4">Performance Analysis</h3>
        <PerformanceAnalysis
          stats={stats}
          trades={trades && trades.length >= 3 ? trades : []}
          isLoading={isLoadingStats || isLoadingTrades}
          onTradesChanged={refreshTrades}
        />
      </div>

      {/* Chart Section */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <ProfitLossChart trades={trades || []} isLoading={isLoadingTrades} />
        <CurrencyPairPerformance 
          stats={{
            pairPerformance: trades?.reduce((acc: Record<string, any>, trade) => {
              const pair = trade.currency_pair;
              if (!acc[pair]) {
                acc[pair] = {
                  totalTrades: 0,
                  profitLoss: 0
                };
              }
              acc[pair].totalTrades++;
              acc[pair].profitLoss += trade.profit_loss;
              return acc;
            }, {}) || {} 
          }}
          trades={trades || []}
          isLoading={isLoadingTrades}
        />
      </div>

      {/* Calendar Section */}
      <div className="mt-6 sm:mt-8">
        <TradeCalendar 
          trades={trades || []} 
          isLoading={isLoadingTrades} 
          userRegistrationDate={userProfile?.created_at || user?.created_at}
        />
      </div>
      
      {/* AI Trading Insights */}
      <div className="mt-6 sm:mt-8">
        <h3 className="text-base sm:text-lg font-semibold gradient-heading mb-3 sm:mb-4">AI Trading Insights</h3>
        <AITradingInsights 
          trades={trades || []} 
          stats={stats} 
          isLoading={isLoadingTrades || isLoadingStats} 
        />
      </div>

      {/* Top Down Analysis History */}
      <div className="mt-6 sm:mt-8">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-primary">Top Down Analysis History</h3>
          {tdaCount && tdaCount > 5 && (
            <Button 
              variant="link" 
              size="sm"
              onClick={() => router.push('/top-down-analysis')}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium p-0"
            >
              View All
            </Button>
          )}
        </div>
        <TDAHistory />
      </div>

      {/* Recent Trades */}
      <RecentTrades trades={recentProcessedTrades} onTradeUpdated={refreshTrades} />

      <DashboardFooter />
    </div>
  );
};

export default Dashboard;