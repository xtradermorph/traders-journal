'use client'

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";



interface CurrencyPairPerformanceProps {
  trades: Array<{
    date?: string;
    currency_pair?: string;
    profit_loss?: number;
  }> | null;
  isLoading: boolean;
}

const CurrencyPairPerformance = ({ trades, isLoading }: CurrencyPairPerformanceProps) => {
  const [timeframe, setTimeframe] = useState("all");
  
  // Get date range based on selected timeframe
  const getDateRange = () => {
    const now = new Date();
    
    switch (timeframe) {
      case 'week':
        // This week: Monday to Sunday
        const startOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so we go back 6 days
        startOfWeek.setDate(now.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        return { start: startOfWeek, end: endOfWeek };
        
      case 'month':
        // This month: 1st to last day of current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        return { start: startOfMonth, end: endOfMonth };
        
      case '3months':
        // Last 3 months
        const startOf3Months = new Date(now);
        startOf3Months.setMonth(now.getMonth() - 3);
        startOf3Months.setHours(0, 0, 0, 0);
        
        return { start: startOf3Months, end: now };
        
      case '6months':
        // Last 6 months
        const startOf6Months = new Date(now);
        startOf6Months.setMonth(now.getMonth() - 6);
        startOf6Months.setHours(0, 0, 0, 0);
        
        return { start: startOf6Months, end: now };
        
      case 'year':
        // Last 1 year
        const startOfYear = new Date(now);
        startOfYear.setFullYear(now.getFullYear() - 1);
        startOfYear.setHours(0, 0, 0, 0);
        
        return { start: startOfYear, end: now };
        
      case '3years':
        // Last 3 years
        const startOf3Years = new Date(now);
        startOf3Years.setFullYear(now.getFullYear() - 3);
        startOf3Years.setHours(0, 0, 0, 0);
        
        return { start: startOf3Years, end: now };
        
      case '5years':
        // Last 5 years
        const startOf5Years = new Date(now);
        startOf5Years.setFullYear(now.getFullYear() - 5);
        startOf5Years.setHours(0, 0, 0, 0);
        
        return { start: startOf5Years, end: now };
        
      default:
        // All time
        return { start: null, end: null };
    }
  };

  // Transform trades data into currency pair performance based on timeframe
  const getCurrencyPairData = () => {
    if (!trades || trades.length === 0) return [];
    
    const { start, end } = getDateRange();
    

    
    // Filter trades based on timeframe
    const filteredTrades = trades.filter(trade => {
      if (!trade.date) return false;
      
      const tradeDate = new Date(trade.date);
      
      if (start && tradeDate < start) return false;
      if (end && tradeDate > end) return false;
      
      return true;
    });
    

    
    // Group trades by currency pair
    const pairPerformance: Record<string, { totalTrades: number; profitLoss: number }> = {};
    
    filteredTrades.forEach(trade => {
      const pair = trade.currency_pair;
      if (!pair) return;
      
      if (!pairPerformance[pair]) {
        pairPerformance[pair] = { totalTrades: 0, profitLoss: 0 };
      }
      
      pairPerformance[pair].totalTrades += 1;
      pairPerformance[pair].profitLoss += (trade.profit_loss || 0);
    });
    
    // Convert to array and sort by profit/loss
    const pairData = Object.entries(pairPerformance).map(([pair, data]) => {
      return {
        pair,
        profitLoss: data.profitLoss,
        totalTrades: data.totalTrades
      };
    });
    
    return pairData.sort((a, b) => b.profitLoss - a.profitLoss);
  };
  
  const currencyPairs = getCurrencyPairData();
  
  // Limit to top 5 currencies (best to worst order)
  const displayPairs = currencyPairs.slice(0, 5);
  
  // Find the maximum absolute profit/loss value to calculate percentage width
  const maxAbsProfitLoss = displayPairs.length > 0
    ? Math.max(...displayPairs.map(pair => Math.abs(pair.profitLoss)))
    : 1;
  
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-foreground">Currency Pair Performance</h3>
          <div className="flex items-center space-x-2">
            <Select
              value={timeframe}
              onValueChange={setTimeframe}
            >
              <SelectTrigger className="text-xs h-8 w-[140px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="year">Last 1 Year</SelectItem>
                <SelectItem value="3years">Last 3 Years</SelectItem>
                <SelectItem value="5years">Last 5 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4 relative">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1 mx-3" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : displayPairs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No currency pair data available</p>
            </div>
          ) : (
            <>
              <div className={`space-y-4 ${currencyPairs.length > 5 ? 'max-h-[200px] overflow-y-auto pr-2' : ''}`}>
                {displayPairs.map((pair) => (
                  <div key={pair.pair} className="flex items-center">
                    <div className="w-20 flex-shrink-0">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{pair.pair}</span>
                    </div>
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mx-3 shadow-inner">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all shadow-sm",
                          pair.profitLoss >= 0 
                            ? "bg-gradient-to-r from-green-400 to-green-500" 
                            : "bg-gradient-to-r from-red-400 to-red-500"
                        )}
                        style={{ width: `${(Math.abs(pair.profitLoss) / maxAbsProfitLoss) * 100}%` }}
                      ></div>
                    </div>
                    <div className="w-16 flex-shrink-0 text-right">
                      <span className={cn(
                        "text-sm font-semibold",
                        pair.profitLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {pair.profitLoss >= 0 ? '+' : ''}{pair.profitLoss.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrencyPairPerformance;
