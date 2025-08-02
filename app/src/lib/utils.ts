'use client'

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Trade } from '@/types/trade';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ProcessedTrade extends Trade {
  month_trade_number: number;
}

// Returns trades with month_trade_number for each trade
export function processTrades(trades: any[]): ProcessedTrade[] {
  if (!trades || !Array.isArray(trades) || trades.length === 0) return [];

  // Group trades by month
  const groupedByMonth: Record<string, any[]> = {};
  trades.forEach(trade => {
    const tradeDate = new Date(trade.date);
    const monthYear = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
    if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = [];
    groupedByMonth[monthYear].push(trade);
  });

  // For each month, sort by date ascending (oldest first), then by entry_time, then by created_at
  let processed: ProcessedTrade[] = [];
  Object.values(groupedByMonth).forEach(monthTrades => {
    // Sort by date ascending (oldest first), then by entry_time, then by created_at
    const sorted = [...monthTrades].sort((a, b) => {
      // First by date
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      // Then by entry_time (if available)
      if (a.entry_time && b.entry_time) {
        return a.entry_time.localeCompare(b.entry_time);
      }
      // Fallback: by created_at (if available)
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });
    // Assign ascending numbers
    sorted.forEach((trade, idx) => {
      processed.push({
        ...trade,
        month_trade_number: idx + 1,
      });
    });
  });

  // Return all processed trades
  return processed;
}

// Get current week start (Monday) and end (Sunday) dates
export function getCurrentWeekRange(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // Days to go back to Monday
  
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - daysToMonday);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Add 6 days to get to Sunday
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}

// Filter trades for current week (Monday to Sunday)
export function filterTradesByCurrentWeek(trades: Trade[]): Trade[] {
  if (!trades || !Array.isArray(trades) || trades.length === 0) return [];
  
  const { startDate, endDate } = getCurrentWeekRange();
  
  return trades.filter(trade => {
    const tradeDate = new Date(trade.date);
    return tradeDate >= startDate && tradeDate <= endDate;
  });
}

// Calculate dashboard stats for a specific set of trades
export function calculateDashboardStats(trades: Trade[]) {
  if (!trades || !Array.isArray(trades) || trades.length === 0) {
    return {
      avgTradesPerDay: 0,
      avgTimeInTrade: 0,
      avgPositivePips: 0,
      percentPositiveTrades: 0,
      hasData: false,
    };
  }
  
  // 1. Average Trades Per Day
  const tradeDates = trades.map(t => t.date ? new Date(t.date).toDateString() : null).filter(Boolean);
  const uniqueDays = Array.from(new Set(tradeDates));
  const avgTradesPerDay = uniqueDays.length > 0 ? trades.length / uniqueDays.length : 0;

  // 2. Average Time in Trade
  const durations = trades.map(t => typeof t.duration === 'number' ? t.duration : Number(t.duration)).filter(n => !isNaN(n));
  const avgTimeInTrade = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // 3. Average Positive Pips per Trade
  const positivePipTrades = trades.filter(t => (t.pips ?? 0) > 0);
  const avgPositivePips = positivePipTrades.length > 0 ? positivePipTrades.reduce((sum, t) => sum + (t.pips ?? 0), 0) / positivePipTrades.length : 0;

  // 4. Percentage of Positive Trades
  const percentPositiveTrades = trades.length > 0 ? (positivePipTrades.length / trades.length) * 100 : 0;

  return {
    avgTradesPerDay,
    avgTimeInTrade,
    avgPositivePips,
    percentPositiveTrades,
    hasData: true,
  };
}

// Calculate comprehensive dashboard stats including profit/loss metrics
export function calculateComprehensiveStats(trades: Trade[]) {
  if (!trades || trades.length === 0) {
    return {
      winRate: 0,
      totalProfit: 0,
      avgTradeProfit: 0,
      riskRewardRatio: 0,
    };
  }
  
  // Calculate win rate (percentage of profitable trades)
  const profitableTrades = trades.filter(t => (t.profit_loss ?? 0) > 0);
  const winRate = trades.length > 0 ? (profitableTrades.length / trades.length) * 100 : 0;
  
  // Calculate total profit/loss
  const totalProfit = trades.reduce((sum, t) => sum + (t.profit_loss ?? 0), 0);
  
  // Calculate average profit per trade
  const avgTradeProfit = trades.length > 0 ? totalProfit / trades.length : 0;
  
  // Calculate risk/reward ratio (average winning trade / average losing trade)
  const winningTrades = trades.filter(t => (t.profit_loss ?? 0) > 0);
  const losingTrades = trades.filter(t => (t.profit_loss ?? 0) < 0);
  
  const avgWinningTrade = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + (t.profit_loss ?? 0), 0) / winningTrades.length 
    : 0;
  
  const avgLosingTrade = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit_loss ?? 0), 0)) / losingTrades.length 
    : 0;
  
  const riskRewardRatio = avgLosingTrade > 0 ? avgWinningTrade / avgLosingTrade : 0;
  
  return {
    winRate,
    totalProfit,
    avgTradeProfit,
    riskRewardRatio,
  };
}
