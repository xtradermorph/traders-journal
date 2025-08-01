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
import { processTrades, filterTradesByCurrentWeek, calculateComprehensiveStats } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import DashboardFooter from '@/components/DashboardFooter';
import LoadingSpinner from '@/components/LoadingSpinner';

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [performanceView, setPerformanceView] = useState<'total' | 'currentWeek'>('total');
  const [toggleLoading, setToggleLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Authentication redirect logic
  useEffect(() => {
    if (isClient && !authLoading && !user) {
      console.log('Dashboard auth state:', { loading: authLoading, isAuthenticated: !!user, user });
      router.push('/login');
    }
  }, [user, authLoading, router, isClient]);
  
  // Show loading while checking authentication or not client-side
  if (authLoading || !isClient) {
    return (
      <div className="w-full max-w-[98vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-2 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-2 sm:my-6 md:my-8 flex flex-col min-h-[80vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }
  
  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Add query to fetch user profile data
  const { data: userProfile, isLoading: isLoadingProfile, error: userProfileError, refetch: refetchUserProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user || !isClient) {
        return null;
      }
      try {
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
      } catch (error) {
        console.error('Profile fetch failed:', error);
        return null;
      }
    },
    enabled: !!user && !authLoading && isClient,
    initialData: null,
    retry: 2,
    retryDelay: 1000
  });

  // Fetch user settings including performance view preference
  const { data: userSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: async () => {
      if (!user || !isClient) return { recent_trades_count: 5, performance_view: 'total' };
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('recent_trades_count, performance_view')
          .eq('user_id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Dashboard - Settings fetch error:', error);
          throw error;
        }
        return data || { recent_trades_count: 5, performance_view: 'total' };
      } catch (error) {
        console.error('Settings fetch failed:', error);
        return { recent_trades_count: 5, performance_view: 'total' };
      }
    },
    enabled: !!user && !authLoading && isClient,
    initialData: { recent_trades_count: 5, performance_view: 'total' },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch trades data
  const { data: trades, isLoading: isLoadingTrades, error: tradesError, refetch: refetchTrades } = useQuery({
    queryKey: ["trades", user?.id],
    queryFn: async () => {
      if (!user || !isClient) return [];
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('entry_time', { ascending: false });
        if (error) {
          console.error('Dashboard - Trades fetch error:', error);
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('Trades fetch failed:', error);
        return [];
      }
    },
    enabled: !!user && !authLoading && isClient,
    initialData: [],
    retry: 2,
    retryDelay: 1000
  });

  // Set up event listeners for storage changes and focus events
  useEffect(() => {
    if (!isClient) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'trades-updated') {
        refetchTrades();
      }
    };

    const handleFocus = () => {
      refetchTrades();
      refetchUserProfile();
      refetchSettings();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchTrades();
        refetchUserProfile();
        refetchSettings();
      }
    };

    const handlePerformanceViewChange = (e: CustomEvent) => {
      if (e.detail && (e.detail.view === 'total' || e.detail.view === 'currentWeek')) {
        setPerformanceView(e.detail.view);
        savePerformanceView(e.detail.view);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('performance-view-change', handlePerformanceViewChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('performance-view-change', handlePerformanceViewChange as EventListener);
    };
  }, [refetchTrades, refetchUserProfile, refetchSettings, isClient]);

  const savePerformanceView = async (view: 'total' | 'currentWeek') => {
    if (!user || !isClient) return;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          performance_view: view
        });
      
      if (error) {
        console.error('Error saving performance view:', error);
      }
    } catch (error) {
      console.error('Error saving performance view:', error);
    }
  };

  // Process trades data safely
  const processedTrades = useCallback(() => {
    try {
      return processTrades(trades || []);
    } catch (error) {
      console.error('Error processing trades:', error);
      return [];
    }
  }, [trades]);

  const currentWeekTrades = useCallback(() => {
    try {
      return filterTradesByCurrentWeek(processedTrades());
    } catch (error) {
      console.error('Error filtering trades:', error);
      return [];
    }
  }, [processedTrades]);
  
  // Calculate stats based on current view safely
  const stats = useCallback(() => {
    try {
      const calculatedStats = calculateComprehensiveStats(
        performanceView === 'currentWeek' ? currentWeekTrades() : processedTrades()
      );
      return calculatedStats as any; // Cast to any to avoid type conflicts
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        winRate: 0,
        totalProfit: 0,
        avgTradeProfit: 0,
        riskRewardRatio: 0,
      } as any;
    }
  }, [performanceView, currentWeekTrades, processedTrades]);

  // Handle performance view toggle
  const handlePerformanceViewToggle = async () => {
    if (!isClient) return;
    
    setToggleLoading(true);
    const newView = performanceView === 'total' ? 'currentWeek' : 'total';
    setPerformanceView(newView);
    
    try {
      await savePerformanceView(newView);
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] });
    } catch (error) {
      console.error('Error toggling performance view:', error);
    } finally {
      setToggleLoading(false);
    }
  };

  // Error handling for failed queries
  if (tradesError) {
    console.error('Dashboard trades error:', tradesError);
  }

  if (userProfileError) {
    console.error('Dashboard profile error:', userProfileError);
  }

  const refreshTrades = () => {
    if (!isClient) return;
    refetchTrades();
    refetchUserProfile();
    refetchSettings();
  };

  // If there's a critical error, show error state
  if (hasError) {
    return (
      <div className="w-full max-w-[98vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-2 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-2 sm:my-6 md:my-8 flex flex-col min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-4">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">There was an error loading the dashboard.</p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  const currentStats = stats();
  const currentProcessedTrades = processedTrades();
  const currentWeekTradesData = currentWeekTrades();

  return (
    <div className="w-full max-w-[98vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-2 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-2 sm:my-6 md:my-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {userProfile?.username || user?.email?.split('@')[0] || 'Trader'}!
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePerformanceViewToggle}
            disabled={toggleLoading}
            className="flex items-center gap-2"
          >
            {toggleLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                {performanceView === 'total' ? <TrendingUp className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                {performanceView === 'total' ? 'All Time' : 'This Week'}
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTrades}
            disabled={isLoadingTrades}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PerfSummaryCard
          title="Win Rate"
          value={`${currentStats.winRate.toFixed(1)}%`}
          icon="lucide lucide-percent-circle"
          variant="primary"
        />
        <PerfSummaryCard
          title="Total Profit"
          value={`$${currentStats.totalProfit.toFixed(2)}`}
          icon="lucide lucide-trending-up"
          variant="secondary"
        />
        <PerfSummaryCard
          title="Avg Trade"
          value={`$${currentStats.avgTradeProfit.toFixed(2)}`}
          icon="lucide lucide-timer"
          variant="accent"
        />
        <PerfSummaryCard
          title="Risk/Reward"
          value={currentStats.riskRewardRatio.toFixed(2)}
          icon="lucide lucide-calendar-check"
          variant="primary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Analysis */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold mb-4">Performance Analysis</h2>
            <PerformanceAnalysis 
              trades={performanceView === 'currentWeek' ? currentWeekTradesData : currentProcessedTrades}
              stats={currentStats}
              isLoading={isLoadingTrades}
            />
          </div>

          {/* Profit/Loss Chart */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold mb-4">Profit/Loss Chart</h2>
            <ProfitLossChart 
              trades={performanceView === 'currentWeek' ? currentWeekTradesData : currentProcessedTrades}
              isLoading={isLoadingTrades}
            />
          </div>

          {/* Currency Pair Performance */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold mb-4">Currency Pair Performance</h2>
            <CurrencyPairPerformance 
              trades={performanceView === 'currentWeek' ? currentWeekTradesData : currentProcessedTrades}
              stats={currentStats}
              isLoading={isLoadingTrades}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Trades */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold mb-4">Recent Trades</h2>
            <RecentTrades 
              trades={currentProcessedTrades.slice(0, userSettings?.recent_trades_count || 5)} 
            />
          </div>

          {/* Trading Workflow Guide */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold mb-4">Trading Workflow</h2>
            <TradingWorkflowGuide />
          </div>

          {/* TDA History */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold mb-4">Recent TDA</h2>
            <TDAHistory />
          </div>

          {/* Trade Calendar */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold mb-4">Trade Calendar</h2>
            <TradeCalendar 
              trades={currentProcessedTrades}
              isLoading={isLoadingTrades}
            />
          </div>
        </div>
      </div>

      {/* AI Trading Insights */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">AI Trading Insights</h2>
        <AITradingInsights 
          trades={currentProcessedTrades}
          stats={currentStats}
          isLoading={isLoadingTrades}
        />
      </div>

      {/* Footer */}
      <DashboardFooter />
    </div>
  );
};

export default Dashboard;