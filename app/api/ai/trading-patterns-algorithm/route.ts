import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export const runtime = "edge";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { trades } = await req.json();
    
    if (!trades || trades.length === 0) {
      return NextResponse.json({ analysis: "Not enough trading data to analyze patterns." });
    }

    // Algorithm-based analysis (completely free)
    const analysis = generateAlgorithmAnalysis(trades);
    return NextResponse.json({ analysis });

  } catch (error) {
    console.error("Trading pattern analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateAlgorithmAnalysis(trades: Array<Record<string, unknown>>): string {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Calculate metrics
  const winningTrades = trades.filter(trade => {
    const tradeData = trade as Record<string, unknown>;
    const profitLoss = tradeData.profit_loss as number || tradeData.pnl as number || 0;
    return profitLoss > 0;
  });
  const winRate = (winningTrades.length / trades.length) * 100;
  
  // Group by currency pair
  const pairCounts: Record<string, {count: number, wins: number, totalPnl: number}> = {};
  trades.forEach(trade => {
    const tradeData = trade as Record<string, unknown>;
    const pair = (tradeData.currency_pair as string) || 'Unknown';
    if (!pairCounts[pair]) {
      pairCounts[pair] = {count: 0, wins: 0, totalPnl: 0};
    }
    pairCounts[pair].count++;
    const tradePnl = (tradeData.profit_loss as number) || (tradeData.pnl as number) || 0;
    pairCounts[pair].totalPnl += tradePnl;
    if (tradePnl > 0) {
      pairCounts[pair].wins++;
    }
  });
  
  // Find best and worst pairs
  let bestPair = 'Unknown';
  let worstPair = 'Unknown';
  let bestWinRate = 0;
  let worstWinRate = 100;
  
  Object.entries(pairCounts).forEach(([pair, data]) => {
    if (data.count >= 3) {
      const pairWinRate = (data.wins / data.count) * 100;
      if (pairWinRate > bestWinRate) {
        bestWinRate = pairWinRate;
        bestPair = pair;
      }
      if (pairWinRate < worstWinRate) {
        worstWinRate = pairWinRate;
        worstPair = pair;
      }
    }
  });
  
  // Time-based analysis
  const morningTrades = trades.filter(trade => {
    const tradeData = trade as Record<string, unknown>;
    const entryTime = (tradeData.entry_time as string) || (tradeData.date as string) || '';
    const hour = new Date(entryTime).getHours();
    return hour >= 6 && hour < 12;
  });

  const afternoonTrades = trades.filter(trade => {
    const tradeData = trade as Record<string, unknown>;
    const entryTime = (tradeData.entry_time as string) || (tradeData.date as string) || '';
    const hour = new Date(entryTime).getHours();
    return hour >= 12 && hour < 18;
  });

  const eveningTrades = trades.filter(trade => {
    const tradeData = trade as Record<string, unknown>;
    const entryTime = (tradeData.entry_time as string) || (tradeData.date as string) || '';
    const hour = new Date(entryTime).getHours();
    return hour >= 18 && hour < 24;
  });

  const nightTrades = trades.filter(trade => {
    const tradeData = trade as Record<string, unknown>;
    const entryTime = (tradeData.entry_time as string) || (tradeData.date as string) || '';
    const hour = new Date(entryTime).getHours();
    return hour >= 0 && hour < 6;
  });
  
  const morningWinRate = morningTrades.length > 0 ?
    (morningTrades.filter(t => {
      const tradeData = t as Record<string, unknown>;
      const pnl = (tradeData.profit_loss as number) || (tradeData.pnl as number) || 0;
      return pnl > 0;
    }).length / morningTrades.length) * 100 : 0;

  const afternoonWinRate = afternoonTrades.length > 0 ?
    (afternoonTrades.filter(t => {
      const tradeData = t as Record<string, unknown>;
      const pnl = (tradeData.profit_loss as number) || (tradeData.pnl as number) || 0;
      return pnl > 0;
    }).length / afternoonTrades.length) * 100 : 0;

  const eveningWinRate = eveningTrades.length > 0 ?
    (eveningTrades.filter(t => {
      const tradeData = t as Record<string, unknown>;
      const pnl = (tradeData.profit_loss as number) || (tradeData.pnl as number) || 0;
      return pnl > 0;
    }).length / eveningTrades.length) * 100 : 0;

  const nightWinRate = nightTrades.length > 0 ?
    (nightTrades.filter(t => {
      const tradeData = t as Record<string, unknown>;
      const pnl = (tradeData.profit_loss as number) || (tradeData.pnl as number) || 0;
      return pnl > 0;
    }).length / nightTrades.length) * 100 : 0;
  
  const bestTimeframe = morningWinRate > afternoonWinRate ? 'morning' : 'afternoon';
  
  // Risk analysis
  const avgLotSize = trades.reduce((sum, t) => {
    const tradeData = t as Record<string, unknown>;
    const lotSize = (tradeData.lot_size as number) || 0;
    return sum + lotSize;
  }, 0) / trades.length;

  const maxLoss = Math.min(...trades.map(t => {
    const tradeData = t as Record<string, unknown>;
    return (tradeData.profit_loss as number) || (tradeData.pnl as number) || 0;
  }));

  const maxWin = Math.max(...trades.map(t => {
    const tradeData = t as Record<string, unknown>;
    return (tradeData.profit_loss as number) || (tradeData.pnl as number) || 0;
  }));
  
  return `## Trading Pattern Analysis (${formattedDate})

Based on the ${trades.length} trades analyzed, here are the key patterns identified:

### Performance Overview
- **Overall Win Rate**: ${winRate.toFixed(1)}% ${winRate > 50 ? '✅ (Above average)' : '⚠️ (Needs improvement)'}
- **Average Lot Size**: ${avgLotSize.toFixed(2)} lots
- **Largest Win**: $${maxWin.toFixed(2)}
- **Largest Loss**: $${maxLoss.toFixed(2)}

### Currency Pair Performance
${bestPair !== 'Unknown' ? `- **Best Performing**: ${bestPair} (${bestWinRate.toFixed(1)}% win rate)` : '- No clear best performing pair'}
${worstPair !== 'Unknown' ? `- **Worst Performing**: ${worstPair} (${worstWinRate.toFixed(1)}% win rate)` : '- No clear worst performing pair'}

### Time-Based Patterns
- **Morning Trades**: ${morningTrades.length} trades, ${morningWinRate.toFixed(1)}% win rate
- **Afternoon Trades**: ${afternoonTrades.length} trades, ${afternoonWinRate.toFixed(1)}% win rate
- **Best Time**: ${bestTimeframe} sessions

### Strengths
${winRate > 50 ? '- Consistent profitability across trades' : '- Room for improvement in trade selection'}
${bestPair !== 'Unknown' ? `- Strong performance on ${bestPair}` : '- No specific currency pair shows consistent outperformance'}
- Your ${bestTimeframe} trades perform better

### Areas for Improvement
${worstPair !== 'Unknown' ? `- Consider reducing exposure to ${worstPair}` : '- No specific currency pair shows consistent underperformance'}
${winRate < 50 ? '- Focus on improving entry timing and trade selection' : '- Consider letting winning trades run longer'}
- Standardize position sizing for better risk management

### Recommendations
1. ${bestPair !== 'Unknown' ? `Focus on ${bestPair} where your performance is strongest` : 'Concentrate on major pairs with higher liquidity'}
2. Trade more during ${bestTimeframe} hours when your success rate is higher
3. Implement consistent position sizing (1-2% of account per trade)
4. ${worstPair !== 'Unknown' ? `Review your strategy for ${worstPair} or consider avoiding it` : 'Maintain consistent risk management'}

This analysis is based on your recent trading performance and uses algorithmic pattern recognition. For best results, combine these insights with fundamental analysis and risk management techniques.`;
} 