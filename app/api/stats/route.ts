'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Ensure these are set in your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // Fetch trades to calculate stats
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*');

    if (tradesError) throw tradesError;

    // Calculate stats manually since we're using Supabase directly
    const stats = {
      totalTrades: trades?.length || 0,
      profitableTrades: trades?.filter(trade => trade.profit > 0).length || 0,
      totalProfit: trades?.reduce((sum, trade) => sum + trade.profit, 0) || 0,
      averageProfit: trades?.length 
        ? (trades.reduce((sum, trade) => sum + trade.profit, 0) / trades.length)
        : 0,
      winRate: trades?.length 
        ? (trades.filter(trade => trade.profit > 0).length / trades.length * 100)
        : 0
    };

    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to calculate stats', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}