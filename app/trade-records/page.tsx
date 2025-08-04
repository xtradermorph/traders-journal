'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { supabase, useAuth } from '@/lib/supabase';
import { Trade } from '@/types/trade';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddTradeDialog from '@/components/AddTradeDialog';
import EditTradeDialog from '@/components/EditTradeDialog';
import ShareTradeDialog from '@/components/ShareTradeDialog';
import { Plus, Edit, Share, Trash2, ChevronDown, ChevronRight, Star, Search, Filter, TrendingUp, Calendar, DollarSign, Target, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { processTrades, ProcessedTrade } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import ExportTradesDialog from '@/components/ExportTradesDialog';
import { exportTradesToExcel, validateTradesData } from '@/lib/excelExport';
import DashboardFooter from '@/components/DashboardFooter';

interface MonthGroup {
  month_year: string;
  month_display: string;
  trades: ProcessedTrade[];
  isCurrentMonth: boolean;
}

interface YearGroup {
  year: string;
  year_display: string;
  monthGroups: MonthGroup[];
  isCurrentYear: boolean;
}

const formatDatePart = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toISOString().split('T')[0];
};

const formatTime = (dateInput: string | Date | undefined) => {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

function TradeRecordsPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAddTradeDialogOpen, setIsAddTradeDialogOpen] = useState(false);
  const [isEditTradeDialogOpen, setIsEditTradeDialogOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isShareTradeDialogOpen, setIsShareTradeDialogOpen] = useState(false);
  const [sharingTrade, setSharingTrade] = useState<Trade | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Add this state for notes tooltip
  const [openNoteIdx, setOpenNoteIdx] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCurrencyPair, setFilterCurrencyPair] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId);
      
      if (error) throw error;
      return tradeId;
    },
    onSuccess: (deletedTradeId) => {
      // Invalidate and refetch all trade-related queries
      queryClient.invalidateQueries({ queryKey: ['trades', session?.user?.id] });
      
      // Refresh the trades list
      setTrades(prevTrades => prevTrades.filter(trade => trade.id !== deletedTradeId));
      
      toast({
        id: 'trade-delete-success',
        title: 'Trade Deleted Successfully',
        description: 'The trade has been permanently removed from your journal.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        id: 'trade-delete-error',
        title: 'Error Deleting Trade',
        description: error.message || 'Failed to delete trade. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleDeleteTrade = (tradeId: string) => {
    deleteTradeMutation.mutate(tradeId);
  };

  const handleShareTrade = (trade: Trade) => {
    setSharingTrade(trade);
    setIsShareTradeDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setIsShareTradeDialogOpen(false);
    setSharingTrade(null);
  };

  // Export trades handler
  const handleExportTrades = async (tradesToExport: Trade[], fileName: string) => {
    try {
      // Validate trades data
      const validation = validateTradesData(tradesToExport);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid trades data');
      }

      // Export to Excel
      await exportTradesToExcel(tradesToExport, fileName);
      
      toast({
        id: 'export-success',
        title: 'Export Successful',
        description: `Successfully exported ${tradesToExport.length} trades to Excel.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Export error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to export trades');
    }
  };

  // Function to refresh trades data
  const refreshTrades = useCallback(async () => {
    if (!session || !session.user) return;
    
    try {
      setLoading(true);
      const { data: tradesData, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching trades:', fetchError);
        throw fetchError;
      }

      if (!tradesData) {
        throw new Error('No trades data returned');
      }

      setTrades(tradesData);
      setError(null);
    } catch (error) {
      console.error('Trade records refresh error:', error);
      setError('Failed to refresh trade records. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // Check if we're in a server environment
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Set current date
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);

    // Fetch trades with proper error handling
    const fetchTrades = async () => {
      if (!session || !session.user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: tradesData, error: fetchError } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching trades:', fetchError);
          throw fetchError;
        }

        if (!tradesData) {
          throw new Error('No trades data returned');
        }

        setTrades(tradesData);
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error('Trade records fetch error:', error);
        setLoading(false);
        setError('Failed to load trade records. Please try again later.');
      }
    };

    if (!authLoading && session?.user?.id) {
      fetchTrades();
    }
  }, [router, session, authLoading, refreshTrades]);

  // Auto-refresh at midnight to clear Today's Trades
  useEffect(() => {
    if (!currentDate) return;

    const checkDateChange = () => {
      const today = new Date().toISOString().split('T')[0];
      if (today !== currentDate) {
        setCurrentDate(today);
        // Refresh trades data to update Today's Trades section
        refreshTrades();
      }
    };

    // Check every minute for date change
    const interval = setInterval(checkDateChange, 60000);

    // Also check when the page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkDateChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentDate, refreshTrades]);

// Get year groups with month-based organization
const getYearGroups = (trades: Trade[]): YearGroup[] => {
  if (!trades || trades.length === 0) return [];
  
  // Use shared logic to get month-based numbering
  const processed = processTrades(trades);
  
  // Group by year first, then by month within each year
  const groupedByYear: Record<string, Record<string, ProcessedTrade[]>> = {};
  
  processed.forEach(trade => {
    const tradeDate = new Date(trade.date);
    const year = tradeDate.getFullYear().toString();
    const monthYear = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!groupedByYear[year]) groupedByYear[year] = {};
    if (!groupedByYear[year][monthYear]) groupedByYear[year][monthYear] = [];
    groupedByYear[year][monthYear].push(trade);
  });
  
  // Create year groups
  const yearGroups: YearGroup[] = Object.entries(groupedByYear).map(([year, yearTrades]) => {
    const currentYear = new Date().getFullYear().toString();
    const isCurrentYear = year === currentYear;
    
    // Create month groups for this year
    const monthGroups: MonthGroup[] = Object.entries(yearTrades).map(([monthYear, monthTrades]) => ({
      month_year: monthYear,
      month_display: new Date(monthTrades[0].date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      trades: monthTrades,
      isCurrentMonth: monthYear === new Date().toISOString().slice(0, 7),
    }));
    
    // Sort months: current month first (if current year), then newest to oldest
    monthGroups.sort((a, b) => {
      if (isCurrentYear && a.isCurrentMonth && !b.isCurrentMonth) return -1;
      if (isCurrentYear && !a.isCurrentMonth && b.isCurrentMonth) return 1;
      return b.month_year.localeCompare(a.month_year);
    });
    
    return {
      year,
      year_display: year,
      monthGroups,
      isCurrentYear,
    };
  });
  
  // Sort years: current year first, then newest to oldest
  return yearGroups.sort((a, b) => {
    if (a.isCurrentYear && !b.isCurrentYear) return -1;
    if (!a.isCurrentYear && b.isCurrentYear) return 1;
    return b.year.localeCompare(a.year);
  });
};

// Legacy function for backward compatibility
const getMonthGroups = (trades: Trade[]) => {
  const yearGroups = getYearGroups(trades);
  if (yearGroups.length === 0) return [];
  
  // Return only current year's month groups for backward compatibility
  const currentYearGroup = yearGroups.find(group => group.isCurrentYear);
  return currentYearGroup ? currentYearGroup.monthGroups : [];
};

  // Get today's trades
  const getTodayTrades = (trades: Trade[]): ProcessedTrade[] => {
    if (!trades || trades.length === 0) return [];

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const todayTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.date).toISOString().split('T')[0];
      return tradeDate === today;
    });

    // Sort by creation time (newest first) and add sequential numbering
    return todayTrades
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((trade, index) => ({
        ...trade,
        month_trade_number: todayTrades.length - index // Reverse numbering (newest = highest number)
      }));
  };

  const yearGroups = trades ? getYearGroups(trades) : [];

  // Calculate performance statistics
  const calculateStats = () => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        totalProfit: 0,
        winRate: 0,
        avgTradeProfit: 0,
        totalPips: 0,
        avgPips: 0,
        profitableTrades: 0,
        losingTrades: 0
      };
    }

    const profitableTrades = trades.filter(t => (t.profit_loss || 0) > 0);
    const losingTrades = trades.filter(t => (t.profit_loss || 0) < 0);
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalPips = trades.reduce((sum, t) => sum + (t.pips || 0), 0);

    return {
      totalTrades: trades.length,
      totalProfit,
      winRate: (profitableTrades.length / trades.length) * 100,
      avgTradeProfit: totalProfit / trades.length,
      totalPips,
      avgPips: totalPips / trades.length,
      profitableTrades: profitableTrades.length,
      losingTrades: losingTrades.length
    };
  };

  const stats = calculateStats();

  // Filter trades based on search and filter criteria
  const getFilteredTrades = (tradesToFilter: Trade[]) => {
    if (!tradesToFilter) return [];
    
    let filtered = [...tradesToFilter];
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(trade => {
        // Search in currency pair
        const currencyMatch = trade.currency_pair?.toLowerCase().includes(searchLower);
        
        // Search in tags (handle both string and array)
        let tagsMatch = false;
        if (trade.tags) {
          if (typeof trade.tags === 'string') {
            tagsMatch = trade.tags.toLowerCase().includes(searchLower);
          } else if (Array.isArray(trade.tags)) {
            tagsMatch = trade.tags.some(tag => tag.toLowerCase().includes(searchLower));
          }
        }
        
        // Search in notes
        const notesMatch = trade.notes?.toLowerCase().includes(searchLower);
        
        return currencyMatch || tagsMatch || notesMatch;
      });
    }
    
    // Filter by currency pair
    if (filterCurrencyPair !== 'all') {
      filtered = filtered.filter(trade => trade.currency_pair === filterCurrencyPair);
    }
    
    // Filter by date range
    if (filterDateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.date);
        
        switch (filterDateRange) {
          case 'today':
            // Today only (from start of day to end of day)
            const todayStart = new Date(today);
            const todayEnd = new Date(today);
            todayEnd.setDate(todayEnd.getDate() + 1);
            return tradeDate >= todayStart && tradeDate < todayEnd;
            
          case 'week':
            // This week (Monday to Sunday)
            const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Convert to Monday-based week
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - daysFromMonday);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            return tradeDate >= weekStart && tradeDate < weekEnd;
            
          case 'month':
            // This month (1st day to last day of current month)
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return tradeDate >= monthStart && tradeDate < monthEnd;
            
          case '3months':
            // Last 3 months (from 3 months ago to today)
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            return tradeDate >= threeMonthsAgo;
            
          case '6months':
            // Last 6 months (from 6 months ago to today)
            const sixMonthsAgo = new Date(today);
            sixMonthsAgo.setMonth(today.getMonth() - 6);
            return tradeDate >= sixMonthsAgo;
            
          case 'year':
            // This year (January 1st to December 31st of current year)
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
            return tradeDate >= yearStart && tradeDate < yearEnd;
            
          default:
            return true;
        }
      });
    }
    
    return filtered;
  };

  // Apply filters to trades
  const filteredTrades = getFilteredTrades(trades || []);
  const filteredYearGroups = filteredTrades.length > 0 ? getYearGroups(filteredTrades) : [];
  const filteredTodayTrades = filteredTrades.length > 0 ? getTodayTrades(filteredTrades) : [];

  // Ensure current month is open by default
  useEffect(() => {
    if (openMonth === null) {
      const currentYearGroup = yearGroups.find((g) => g.isCurrentYear);
      if (currentYearGroup) {
        const current = currentYearGroup.monthGroups.find((g) => g.isCurrentMonth);
        if (current) {
          setOpenMonth(current.month_year);
        }
      }
    }
  }, [trades, openMonth]);

  let pageContent: React.ReactNode = null;

  if (loading) {
    pageContent = (
      <div className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 flex flex-col min-h-[80vh]">
        <div ref={mainScrollRef} className="flex-1 overflow-y-auto">
          <div className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
              <Skeleton className="h-8 sm:h-10 w-24 sm:w-32" />
            </div>
            {/* Today's Trades Skeleton */}
            <div className="mb-8">
              <div className="mb-4 pt-2 border-t border-border">
                <Skeleton className="h-8 w-48" />
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="h-10">
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Currency Pair</TableHead>
                      <TableHead>Entry Time</TableHead>
                      <TableHead>Exit Time</TableHead>
                      <TableHead>Duration (m)</TableHead>
                      <TableHead>Entry Price</TableHead>
                      <TableHead>Exit Price</TableHead>
                      <TableHead>Net Pips</TableHead>
                      <TableHead>Lot Size</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                                          {[...Array(2)].map((_, tradeIndex) => (
                        <TableRow key={tradeIndex} className="h-12">
                          {[...Array(15)].map((_, cellIndex) => (
                          <TableCell key={cellIndex} className="py-2"><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            {[...Array(2)].map((_, monthIndex) => (
              <div key={monthIndex} className="mb-10">
                <div className="mb-4 pt-2 border-t border-border">
                  <Skeleton className="h-8 w-48" />
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="h-10">
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Currency Pair</TableHead>
                        <TableHead>Entry Time</TableHead>
                        <TableHead>Exit Time</TableHead>
                        <TableHead>Duration (m)</TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>Exit Price</TableHead>
                        <TableHead>Net Pips</TableHead>
                        <TableHead>Lot Size</TableHead>
                        <TableHead className="text-right">P/L</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(3)].map((_, tradeIndex) => (
                        <TableRow key={tradeIndex} className="h-12">
                          {[...Array(15)].map((_, cellIndex) => (
                            <TableCell key={cellIndex} className="py-2"><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DashboardFooter />
      </div>
    );
  } else if (error) {
    pageContent = (
      <div className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 flex flex-col min-h-[80vh]">
        <div ref={mainScrollRef} className="flex-1 overflow-y-auto">
          <div className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 lg:px-8">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
        <DashboardFooter />
      </div>
    );
  } else if (trades && trades.length === 0) {
    pageContent = (
      <div className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 flex flex-col min-h-[80vh]">
        <div ref={mainScrollRef} className="flex-1 overflow-y-auto">
          <div className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <Button 
                  onClick={() => setIsExportDialogOpen(true)}
                  variant="outline"
                  className="flex items-center gap-1 sm:gap-2 text-sm"
                  disabled={!trades || trades.length === 0}
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" /> Export
                </Button>
                <Button 
                  onClick={() => setIsAddTradeDialogOpen(true)}
                  className="flex items-center gap-1 sm:gap-2 text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> Add Trade
                </Button>
              </div>
            </div>
            {/* Empty State for No Trades */}
            <div className="bg-muted/60 border border-muted rounded-lg p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto shadow-sm mb-6 sm:mb-8">
              <Target className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No trades recorded yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Start tracking your trading performance by adding your first trade. Monitor your progress, analyze patterns, and improve your strategy over time.
              </p>
              <Button 
                onClick={() => setIsAddTradeDialogOpen(true)}
                className="flex items-center gap-1 sm:gap-2 text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> Add Your First Trade
              </Button>
            </div>
          </div>
        </div>
        <DashboardFooter />
      </div>
    );
  } else {
    pageContent = (
      <div className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 flex flex-col min-h-[80vh] max-h-[90vh]">
        <div ref={mainScrollRef} className="flex-1 overflow-y-auto">
          <div className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 lg:px-8">
            {/* Performance Summary Cards */}
            {trades && trades.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Trades</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.totalTrades}</p>
                      </div>
                      <Target className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total P/L</p>
                        <p className={cn(
                          "text-lg sm:text-xl md:text-2xl font-bold",
                          stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
                        </p>
                      </div>
                      <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Win Rate</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.winRate.toFixed(1)}%</p>
                      </div>
                      <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg. Trade</p>
                        <p className={cn(
                          "text-lg sm:text-xl md:text-2xl font-bold",
                          stats.avgTradeProfit >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {stats.avgTradeProfit >= 0 ? '+' : ''}${stats.avgTradeProfit.toFixed(2)}
                        </p>
                      </div>
                      <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Action Buttons */}
            {trades && trades.length > 0 && (
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => setIsExportDialogOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={!trades || trades.length === 0}
                  >
                    <Download className="h-4 w-4" /> Export
                  </Button>
                </div>
                <Button 
                  onClick={() => setIsAddTradeDialogOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)] backdrop-blur-sm border border-orange-400/20 transition-all duration-300"
                >
                  <Plus className="h-4 w-4" /> Add Trade
                </Button>
              </div>
            )}
            {/* Empty State for No Trades */}
            {trades && trades.length === 0 && (
              <div className="bg-muted/60 border border-muted rounded-lg p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto shadow-sm mb-8">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No trades recorded yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start tracking your trading performance by adding your first trade. Monitor your progress, analyze patterns, and improve your strategy over time.
                </p>
                <Button 
                  onClick={() => setIsAddTradeDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Your First Trade
                </Button>
              </div>
            )}
            {/* Search and Filter Controls */}
            {trades && trades.length > 0 && (
              <div className="bg-muted/30 border border-muted rounded-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search" className="text-sm font-medium mb-2 block">Search Trades</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by currency pair, tags, or notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="sm:w-48">
                    <Label htmlFor="currency-pair" className="text-sm font-medium mb-2 block">Currency Pair</Label>
                    <Select value={filterCurrencyPair} onValueChange={setFilterCurrencyPair}>
                      <SelectTrigger>
                        <SelectValue placeholder="All pairs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All pairs</SelectItem>
                        <SelectItem value="EURUSD">EUR/USD</SelectItem>
                        <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                        <SelectItem value="USDJPY">USD/JPY</SelectItem>
                        <SelectItem value="AUDUSD">AUD/USD</SelectItem>
                        <SelectItem value="USDCHF">USD/CHF</SelectItem>
                        <SelectItem value="USDCAD">USD/CAD</SelectItem>
                        <SelectItem value="NZDUSD">NZD/USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="sm:w-48">
                    <Label htmlFor="date-range" className="text-sm font-medium mb-2 block">Date Range</Label>
                    <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This week</SelectItem>
                        <SelectItem value="month">This month</SelectItem>
                        <SelectItem value="3months">Last 3 months</SelectItem>
                        <SelectItem value="6months">Last 6 months</SelectItem>
                        <SelectItem value="year">This year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterCurrencyPair('all');
                        setFilterDateRange('all');
                      }}
                      className="h-10"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {/* Results Summary */}
            {trades && trades.length > 0 && (searchTerm || filterCurrencyPair !== 'all' || filterDateRange !== 'all') && (
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                      {filteredTrades.length} of {trades.length} trades
                    </Badge>
                    {(searchTerm || filterCurrencyPair !== 'all' || filterDateRange !== 'all') && (
                      <span className="text-sm text-muted-foreground">
                        (filtered results)
                      </span>
                    )}
                  </div>
                  {filteredTrades.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No trades match your current filters
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Year Tabs */}
            {trades && trades.length > 0 && (
              <div className="mb-6">
                {filteredYearGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                    {filteredYearGroups.map((yearGroup) => (
                    <button
                      key={yearGroup.year}
                      onClick={() => setSelectedYear(selectedYear === yearGroup.year ? null : yearGroup.year)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-colors border-2",
                        selectedYear === yearGroup.year
                          ? "bg-primary text-primary-foreground border-primary"
                          : yearGroup.isCurrentYear
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {yearGroup.isCurrentYear && <Star className="h-3 w-3 fill-current" />}
                        <span>{yearGroup.isCurrentYear ? `${yearGroup.year_display} (Current)` : yearGroup.year_display}</span>
                      </div>
                    </button>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {searchTerm || filterCurrencyPair !== 'all' || filterDateRange !== 'all' ? (
                      <p>No trades match your current filters.</p>
                    ) : (
                      <p>No trades found.</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Today's Trades Section */}
            {trades && trades.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border">
                  Today&apos;s Trades
                </h2>
                {filteredTodayTrades.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto shadow-sm">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                      <TableRow className="h-12 hover:bg-muted/20">
                        <TableHead className="w-16 font-semibold text-xs text-left pl-1">#</TableHead>
                        <TableHead className="font-semibold text-xs text-left pl-1">Date</TableHead>
                        <TableHead className="font-semibold text-xs text-left pl-1">Currency Pair</TableHead>
                        <TableHead className="font-semibold text-xs text-left pl-1">Trade Type</TableHead>
                        <TableHead className="font-semibold text-xs text-left pl-1">Entry Time</TableHead>
                        <TableHead className="font-semibold text-xs text-left pl-1">Exit Time</TableHead>
                        <TableHead className="w-18 font-semibold text-xs text-center">Duration (m)</TableHead>
                        <TableHead className="font-semibold text-xs text-left pl-1">Entry Price</TableHead>
                        <TableHead className="font-semibold text-xs text-left pl-1">Exit Price</TableHead>
                        <TableHead className="w-18 font-semibold text-xs text-right pr-1">Net Pips</TableHead>
                        <TableHead className="font-semibold text-xs text-center">Lot Size</TableHead>
                        <TableHead className="text-right font-semibold text-xs pr-2">P/L</TableHead>
                        <TableHead className="font-semibold text-xs text-center">Currency</TableHead>
                        <TableHead className="font-semibold text-xs text-center">Tags</TableHead>
                        <TableHead className="font-semibold text-xs text-left pl-1">Notes</TableHead>
                        <TableHead className="w-32 font-semibold text-xs text-left pl-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTodayTrades.map((trade) => (
                        <TableRow key={trade.id} className="h-10 text-xs hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-muted-foreground p-1 align-middle">{`#${String(trade.month_trade_number).padStart(2, '0')}`}</TableCell>
                          <TableCell className="text-xs text-muted-foreground p-1 align-middle">{formatDatePart(trade.date)}</TableCell>
                          <TableCell className="text-xs font-medium text-foreground p-1 align-middle">{trade.currency_pair}</TableCell>
                          <TableCell className="text-xs font-medium p-1 align-middle">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              trade.trade_type === 'LONG' 
                                ? "text-green-600 dark:text-green-400" 
                                : "text-red-600 dark:text-red-400"
                            )}>
                              {trade.trade_type}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground p-1 align-middle">{formatTime(trade.entry_time)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground p-1 align-middle">{formatTime(trade.exit_time)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground px-0.5 py-1 align-middle text-center">{trade.duration || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground p-1 align-middle">{
                            trade.currency_pair === 'USDJPY'
                              ? (typeof trade.entry_price === 'number' ? trade.entry_price.toFixed(3) : '-')
                              : (typeof trade.entry_price === 'number' ? trade.entry_price.toFixed(5) : '-')
                          }</TableCell>
                          <TableCell className="text-xs text-muted-foreground px-0.5 py-1 align-middle">{
                            trade.currency_pair === 'USDJPY'
                              ? (typeof trade.exit_price === 'number' ? trade.exit_price.toFixed(3) : '-')
                              : (typeof trade.exit_price === 'number' ? trade.exit_price.toFixed(5) : '-')
                          }</TableCell>
                          <TableCell className="text-xs font-medium px-0.5 py-1 align-middle text-right">
                            <span className={cn((trade.pips ?? 0) > 0 ? 'text-green-500' : (trade.pips ?? 0) < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                              {(trade.pips ?? 0) > 0 ? '+' : ''}{trade.pips ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground p-1 align-middle text-center">{trade.lot_size?.toFixed(2) || '-'}</TableCell>
                          <TableCell className="text-xs font-medium text-right p-1 align-middle">
                            <span className={cn((trade.profit_loss ?? 0) > 0 ? 'text-green-500' : (trade.profit_loss ?? 0) < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                              {(trade.profit_loss ?? 0) > 0 ? '+' : ''}{(trade.profit_loss ?? 0).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground p-1 align-middle text-center">{trade.currency || 'AUD'}</TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground p-1 align-middle text-center">{trade.tags || ''}</TableCell>
                          <TableCell className="text-xs text-muted-foreground p-1 align-middle">
                            {trade.notes ? (
                              <TooltipProvider>
                                <Tooltip open={openNoteIdx === trade.id} onOpenChange={v => setOpenNoteIdx(v ? trade.id : null)}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="max-w-[180px] truncate text-left cursor-pointer bg-transparent border-none outline-none p-0 h-auto min-h-0"
                                      tabIndex={0}
                                      onClick={() => setOpenNoteIdx(openNoteIdx === trade.id ? null : trade.id)}
                                      onBlur={() => setOpenNoteIdx(null)}
                                      asChild={false}
                                    >
                                      {trade.notes.split('\n')[0].length > 50
                                        ? `${trade.notes.split('\n')[0].substring(0, 50)}...`
                                        : trade.notes.split('\n')[0]}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[300px] whitespace-pre-wrap">
                                    <p>{trade.notes}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <div className="max-w-[180px]">-</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm py-2">
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrade(trade);
                                  setIsEditTradeDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit Trade</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleShareTrade(trade);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Share className="h-4 w-4" />
                              </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Share Trade</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <AlertDialog>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                          disabled={deleteTradeMutation.isPending}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete Trade</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Trade</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this trade? This action cannot be undone and will permanently remove the trade from your journal.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteTrade(trade.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      disabled={deleteTradeMutation.isPending}
                                    >
                                      {deleteTradeMutation.isPending ? 'Deleting...' : 'Delete Trade'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || filterCurrencyPair !== 'all' || filterDateRange !== 'all' ? (
                    <p>No trades match your current filters for today.</p>
                  ) : (
                    <p>No trades recorded today.</p>
                  )}
                </div>
              )}
              </div>
            )}
            {/* Year-based Monthly Sections */}
            {(() => {
              // Determine which year to show
              let yearToShow = filteredYearGroups.find(group => group.isCurrentYear);
              
              // If a specific year is selected, show that year
              if (selectedYear) {
                yearToShow = filteredYearGroups.find(group => group.year === selectedYear);
              }
              
              // If no year to show, return empty
              if (!yearToShow) return null;
              
                            return yearToShow.monthGroups.map((group) => {
                // For current year: current month is always open, others are clickable
                // For past years: all months are clickable (collapsed by default)
                const isCurrentYear = yearToShow!.isCurrentYear;
                const isOpen = (isCurrentYear && group.isCurrentMonth) || openMonth === group.month_year;
              return (
                <div key={group.month_year} className="mb-10">
                  {isCurrentYear && group.isCurrentMonth ? (
                    // Current month in current year - always open, no chevron
                    <div className="flex items-center w-full text-left text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border select-none cursor-default">
                      {group.month_display}
                      <span className="ml-2 text-xs text-primary">(Current Month)</span>
                    </div>
                  ) : (
                    // All other months - clickable with chevron
                    <button
                      type="button"
                      className="flex items-center w-full text-left text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                      onClick={() => {
                        setOpenMonth(openMonth === group.month_year ? null : group.month_year);
                      }}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? <ChevronDown className="mr-2 h-5 w-5" /> : <ChevronRight className="mr-2 h-5 w-5" />}
                      {group.month_display}
                    </button>
                  )}
                  {isOpen && (
                    <div className="rounded-md border overflow-x-auto shadow-sm">
                      <Table>
                        <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                          <TableRow className="h-12 hover:bg-muted/20">
                            <TableHead className="w-16 font-semibold text-xs text-left pl-1">#</TableHead>
                            <TableHead className="font-semibold text-xs text-left pl-1">Date</TableHead>
                            <TableHead className="font-semibold text-xs text-left pl-1">Currency Pair</TableHead>
                            <TableHead className="font-semibold text-xs text-left pl-1">Trade Type</TableHead>
                            <TableHead className="font-semibold text-xs text-left pl-1">Entry Time</TableHead>
                            <TableHead className="font-semibold text-xs text-left pl-1">Exit Time</TableHead>
                            <TableHead className="w-18 font-semibold text-xs text-center">Duration (m)</TableHead>
                            <TableHead className="font-semibold text-xs text-left pl-1">Entry Price</TableHead>
                            <TableHead className="font-semibold text-xs text-left pl-1">Exit Price</TableHead>
                            <TableHead className="w-18 font-semibold text-xs text-right pr-1">Net Pips</TableHead>
                            <TableHead className="font-semibold text-xs text-center">Lot Size</TableHead>
                            <TableHead className="text-right font-semibold text-xs pr-2">P/L</TableHead>
                            <TableHead className="font-semibold text-xs text-center">Currency</TableHead>
                            <TableHead className="font-semibold text-xs text-center">Tags</TableHead>
                            <TableHead className="font-semibold text-xs text-left pl-1">Notes</TableHead>
                            <TableHead className="w-32 font-semibold text-xs text-left pl-4">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.trades.length > 0 ? (
                            group.trades.map((trade) => (
                              <TableRow key={trade.id} className="h-10 text-xs hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground p-1 align-middle">{`#${String(trade.month_trade_number).padStart(2, '0')}`}</TableCell>
                                <TableCell className="text-xs text-muted-foreground p-1 align-middle">{formatDatePart(trade.date)}</TableCell>
                                <TableCell className="text-xs font-medium text-foreground p-1 align-middle">{trade.currency_pair}</TableCell>
                                <TableCell className="text-xs font-medium p-1 align-middle">
                                  <span className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    trade.trade_type === 'LONG' 
                                      ? "text-green-600 dark:text-green-400" 
                                      : "text-red-600 dark:text-red-400"
                                  )}>
                                    {trade.trade_type}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground p-1 align-middle">{formatTime(trade.entry_time)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground p-1 align-middle">{formatTime(trade.exit_time)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground px-0.5 py-1 align-middle text-center">{trade.duration || '-'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground p-1 align-middle">{
                                  trade.currency_pair === 'USDJPY'
                                    ? (typeof trade.entry_price === 'number' ? trade.entry_price.toFixed(3) : '-')
                                    : (typeof trade.entry_price === 'number' ? trade.entry_price.toFixed(5) : '-')
                                }</TableCell>
                                <TableCell className="text-xs text-muted-foreground px-0.5 py-1 align-middle">{
                                  trade.currency_pair === 'USDJPY'
                                    ? (typeof trade.exit_price === 'number' ? trade.exit_price.toFixed(3) : '-')
                                    : (typeof trade.exit_price === 'number' ? trade.exit_price.toFixed(5) : '-')
                                }</TableCell>
                                <TableCell className="text-xs font-medium px-0.5 py-1 align-middle text-right">
                                  <span className={cn((trade.pips ?? 0) > 0 ? 'text-green-500' : (trade.pips ?? 0) < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                                    {(trade.pips ?? 0) > 0 ? '+' : ''}{trade.pips ?? 0}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground p-1 align-middle text-center">{trade.lot_size?.toFixed(2) || '-'}</TableCell>
                                <TableCell className="text-xs font-medium text-right p-1 align-middle">
                                  <span className={cn((trade.profit_loss ?? 0) > 0 ? 'text-green-500' : (trade.profit_loss ?? 0) < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                                    {(trade.profit_loss ?? 0) > 0 ? '+' : ''}{(trade.profit_loss ?? 0).toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs font-medium text-muted-foreground p-1 align-middle text-center">{trade.currency || 'AUD'}</TableCell>
                                <TableCell className="text-xs font-medium text-muted-foreground p-1 align-middle text-center">{trade.tags || ''}</TableCell>
                                <TableCell className="text-xs text-muted-foreground p-1 align-middle">
                                  {trade.notes ? (
                                    <TooltipProvider>
                                      <Tooltip open={openNoteIdx === trade.id} onOpenChange={v => setOpenNoteIdx(v ? trade.id : null)}>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            className="max-w-[180px] truncate text-left cursor-pointer bg-transparent border-none outline-none p-0 h-auto min-h-0"
                                            tabIndex={0}
                                            onClick={() => setOpenNoteIdx(openNoteIdx === trade.id ? null : trade.id)}
                                            onBlur={() => setOpenNoteIdx(null)}
                                            asChild={false}
                                          >
                                            {trade.notes.split('\n')[0].length > 50
                                              ? `${trade.notes.split('\n')[0].substring(0, 50)}...`
                                              : trade.notes.split('\n')[0]}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[300px] whitespace-pre-wrap">
                                          <p>{trade.notes}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <div className="max-w-[180px]">-</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm py-2">
                                  <div className="flex items-center gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTrade(trade);
                                        setIsEditTradeDialogOpen(true);
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit Trade</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        handleShareTrade(trade);
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Share className="h-4 w-4" />
                                    </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Share Trade</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <AlertDialog>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                disabled={deleteTradeMutation.isPending}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                          </TooltipTrigger>
                                          <TooltipContent>Delete Trade</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Trade</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this trade? This action cannot be undone and will permanently remove the trade from your journal.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteTrade(trade.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            disabled={deleteTradeMutation.isPending}
                                          >
                                            {deleteTradeMutation.isPending ? 'Deleting...' : 'Delete Trade'}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                                No trades were added to this month
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            });
            })()}
          </div>
        </div>
        <DashboardFooter />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Trade Records" mainScrollRef={mainScrollRef} />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        {/* Glassmorphism background overlay */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10 flex flex-col min-h-[80vh] max-h-[90vh]">
          {pageContent}
        </div>
      </div>
      {/* Always render dialogs at the root so they work in all states */}
      <AddTradeDialog 
        isOpen={isAddTradeDialogOpen} 
        onClose={() => setIsAddTradeDialogOpen(false)}
        redirectTo="/trade-records"
      />
      <EditTradeDialog 
        isOpen={isEditTradeDialogOpen} 
        onClose={() => setIsEditTradeDialogOpen(false)} 
        trade={selectedTrade}
        onTradeUpdated={() => {
          refreshTrades();
          queryClient.invalidateQueries({ queryKey: ['trades', session?.user?.id] });
        }}
      />
      <ShareTradeDialog 
        isOpen={isShareTradeDialogOpen} 
        onClose={handleCloseShareDialog} 
        trade={sharingTrade}
      />
      <ExportTradesDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        trades={trades}
        onExport={handleExportTrades}
      />
    </>
  );
}

export default TradeRecordsPage;