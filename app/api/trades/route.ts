'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { insertTradeSchema } from '@shared/schema'

// Ensure these are set in your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return NextResponse.json(trades || [], { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch trades', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const body = await request.json()
    
    // Validate input using Zod schema
    const validatedTrade = insertTradeSchema.parse(body)

    // Insert trade
    const { data: newTrade, error } = await supabase
      .from('trades')
      .insert(validatedTrade)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Trade added successfully', 
      trade: newTrade 
    }, { status: 201 })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid trade data', 
        details: error.errors 
      }, { status: 400 })
    }

    // Handle Supabase errors
    return NextResponse.json({ 
      error: 'Failed to add trade', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}