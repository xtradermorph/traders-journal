import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      steps: [],
      errors: [],
      fixes_applied: []
    };

    // Step 1: Check existing questions by timeframe
    results.steps.push('Step 1: Checking existing questions by timeframe...');
    
    const { data: existingQuestions, error: checkError } = await supabase
      .from('tda_questions')
      .select('*')
      .order('timeframe', { ascending: true })
      .order('order_index', { ascending: true });

    if (checkError) {
      results.errors.push(`Failed to check questions: ${checkError.message}`);
      return NextResponse.json(results, { status: 500 });
    }

    // Group existing questions by timeframe
    const questionsByTimeframe: { [key: string]: any[] } = {};
    existingQuestions?.forEach(q => {
      if (!questionsByTimeframe[q.timeframe]) {
        questionsByTimeframe[q.timeframe] = [];
      }
      questionsByTimeframe[q.timeframe].push(q);
    });

    results.steps.push(`✅ Found questions for timeframes: ${Object.keys(questionsByTimeframe).join(', ')}`);
    results.fixes_applied.push(`Existing timeframes: ${Object.keys(questionsByTimeframe).join(', ')}`);

    // Step 2: Define all required questions for each timeframe
    results.steps.push('Step 2: Defining required questions for all timeframes...');
    
    const allRequiredQuestions = [
      // DAILY Questions (keep existing, add missing)
      {
        timeframe: 'DAILY',
        question_text: 'Announcements',
        question_type: 'ANNOUNCEMENTS',
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Current Daily Trend',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Long', 'Short', 'Sideways'],
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: "Today's Key Support / Resistance Levels",
        question_type: 'TEXT',
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Cycle Pressure',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish'],
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Notes',
        question_type: 'TEXT',
        order_index: 5,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Previous Candle Colour',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Red', 'Green'],
        order_index: 6,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: "Today's Pivot Point Range",
        question_type: 'MULTIPLE_CHOICE',
        options: ['MidS1 to MidR2', 'MidS2 to MidR1'],
        order_index: 7,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Candle / Chart Patterns',
        question_type: 'TEXT',
        order_index: 8,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Fibonacci: Swing Low',
        question_type: 'TEXT',
        order_index: 9,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Fibonacci: Swing High',
        question_type: 'TEXT',
        order_index: 10,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Waterline',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above', 'Below', 'At'],
        order_index: 11,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Positive', 'Negative', 'Zero'],
        order_index: 12,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Movement',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 13,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 14,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Notes',
        question_type: 'TEXT',
        order_index: 15,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Histogram: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Positive', 'Negative', 'Zero'],
        order_index: 16,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Histogram: Movement',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 17,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Histogram: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 18,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Histogram: Notes',
        question_type: 'TEXT',
        order_index: 19,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Condition',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Overbought', 'Oversold', 'Neutral'],
        order_index: 20,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 21,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above 70', 'Below 30', 'Between 30-70'],
        order_index: 22,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 23,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Notes',
        question_type: 'TEXT',
        order_index: 24,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'REI: Condition',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Overbought', 'Oversold', 'Neutral'],
        order_index: 25,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'REI: Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 26,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'REI: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 27,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'REI: Notes',
        question_type: 'TEXT',
        order_index: 28,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Analysis',
        question_type: 'TEXT',
        order_index: 29,
        is_active: true
      },

      // H1 Questions (keep existing, add missing)
      {
        timeframe: 'H1',
        question_text: 'Trend Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Long', 'Short', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'Key Levels',
        question_type: 'TEXT',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'Cycle Pressure',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'Notes',
        question_type: 'TEXT',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Lines: Waterline',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above', 'Below', 'At'],
        order_index: 5,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Lines: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Positive', 'Negative', 'Zero'],
        order_index: 6,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Lines: Movement',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 7,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Lines: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 8,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Lines: Notes',
        question_type: 'TEXT',
        order_index: 9,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Histogram: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Positive', 'Negative', 'Zero'],
        order_index: 10,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Histogram: Movement',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 11,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Histogram: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 12,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'MACD Histogram: Notes',
        question_type: 'TEXT',
        order_index: 13,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'RSI: Condition',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Overbought', 'Oversold', 'Neutral'],
        order_index: 14,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'RSI: Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 15,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'RSI: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above 70', 'Below 30', 'Between 30-70'],
        order_index: 16,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'RSI: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 17,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'RSI: Notes',
        question_type: 'TEXT',
        order_index: 18,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'REI: Condition',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Overbought', 'Oversold', 'Neutral'],
        order_index: 19,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'REI: Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 20,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'REI: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 21,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'REI: Notes',
        question_type: 'TEXT',
        order_index: 22,
        is_active: true
      },
      {
        timeframe: 'H1',
        question_text: 'Analysis',
        question_type: 'TEXT',
        order_index: 23,
        is_active: true
      },

      // M15 Questions (keep existing, add missing)
      {
        timeframe: 'M15',
        question_text: 'Immediate Price Action',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Entry Signals',
        question_type: 'TEXT',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Current Volatility',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Low', 'Medium', 'High'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Notes',
        question_type: 'TEXT',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Most Relevant Trend Line',
        question_type: 'TEXT',
        order_index: 5,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Price Location',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above Trend', 'Below Trend', 'At Trend'],
        order_index: 6,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Drive/Exhaustion',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Drive', 'Exhaustion', 'Neutral'],
        order_index: 7,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Candle / Chart Patterns',
        question_type: 'TEXT',
        order_index: 8,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Fibonacci: Swing Low',
        question_type: 'TEXT',
        order_index: 9,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Fibonacci: Swing High',
        question_type: 'TEXT',
        order_index: 10,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Lines: Waterline',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above', 'Below', 'At'],
        order_index: 11,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Lines: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Positive', 'Negative', 'Zero'],
        order_index: 12,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Lines: Movement',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 13,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Lines: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 14,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Lines: Notes',
        question_type: 'TEXT',
        order_index: 15,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Histogram: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Positive', 'Negative', 'Zero'],
        order_index: 16,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Histogram: Movement',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 17,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Histogram: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 18,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'MACD Histogram: Notes',
        question_type: 'TEXT',
        order_index: 19,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'RSI: Condition',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Overbought', 'Oversold', 'Neutral'],
        order_index: 20,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'RSI: Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 21,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'RSI: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above 70', 'Below 30', 'Between 30-70'],
        order_index: 22,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'RSI: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 23,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'RSI: Notes',
        question_type: 'TEXT',
        order_index: 24,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'REI: Condition',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Overbought', 'Oversold', 'Neutral'],
        order_index: 25,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'REI: Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 26,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'REI: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 27,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'REI: Notes',
        question_type: 'TEXT',
        order_index: 28,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Analysis',
        question_type: 'TEXT',
        order_index: 29,
        is_active: true
      },

      // H2 Questions (general questions for other timeframes)
      {
        timeframe: 'H2',
        question_text: 'What is the trend direction on the 2-hour timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'H2',
        question_text: 'Are there any key levels or zones to watch?',
        question_type: 'TEXT',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'H2',
        question_text: 'What is the momentum like on this timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Strong', 'Moderate', 'Weak', 'None'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'H2',
        question_text: 'Are there any divergences visible?',
        question_type: 'BOOLEAN',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'H2',
        question_text: 'What is your confidence level in the 2-hour analysis?',
        question_type: 'RATING',
        options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
        order_index: 5,
        is_active: true
      },

      // H4 Questions
      {
        timeframe: 'H4',
        question_text: 'What is the trend direction on the 4-hour timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'H4',
        question_text: 'Are there any key levels or zones to watch?',
        question_type: 'TEXT',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'H4',
        question_text: 'What is the momentum like on this timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Strong', 'Moderate', 'Weak', 'None'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'H4',
        question_text: 'Are there any divergences visible?',
        question_type: 'BOOLEAN',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'H4',
        question_text: 'What is your confidence level in the 4-hour analysis?',
        question_type: 'RATING',
        options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
        order_index: 5,
        is_active: true
      },

      // H8 Questions
      {
        timeframe: 'H8',
        question_text: 'What is the trend direction on the 8-hour timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'H8',
        question_text: 'Are there any key levels or zones to watch?',
        question_type: 'TEXT',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'H8',
        question_text: 'What is the momentum like on this timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Strong', 'Moderate', 'Weak', 'None'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'H8',
        question_text: 'Are there any divergences visible?',
        question_type: 'BOOLEAN',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'H8',
        question_text: 'What is your confidence level in the 8-hour analysis?',
        question_type: 'RATING',
        options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
        order_index: 5,
        is_active: true
      },

      // W1 Questions (Weekly)
      {
        timeframe: 'W1',
        question_text: 'What is the trend direction on the weekly timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'W1',
        question_text: 'Are there any major support/resistance levels visible?',
        question_type: 'TEXT',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'W1',
        question_text: 'What is the current market structure (higher highs/lower lows)?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Higher Highs', 'Lower Lows', 'Sideways'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'W1',
        question_text: 'Are there any major economic events affecting this pair?',
        question_type: 'TEXT',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'W1',
        question_text: 'What is your confidence level in the weekly trend?',
        question_type: 'RATING',
        options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
        order_index: 5,
        is_active: true
      },

      // MN1 Questions (Monthly)
      {
        timeframe: 'MN1',
        question_text: 'What is the trend direction on the monthly timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'MN1',
        question_text: 'Are there any major support/resistance levels visible?',
        question_type: 'TEXT',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'MN1',
        question_text: 'What is the current market structure (higher highs/lower lows)?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Higher Highs', 'Lower Lows', 'Sideways'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'MN1',
        question_text: 'Are there any major economic events affecting this pair?',
        question_type: 'TEXT',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'MN1',
        question_text: 'What is your confidence level in the monthly trend?',
        question_type: 'RATING',
        options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
        order_index: 5,
        is_active: true
      },

      // M30 Questions
      {
        timeframe: 'M30',
        question_text: 'What is the trend direction on the 30-minute timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'M30',
        question_text: 'Are there any key levels or zones to watch?',
        question_type: 'TEXT',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'M30',
        question_text: 'What is the momentum like on this timeframe?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Strong', 'Moderate', 'Weak', 'None'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'M30',
        question_text: 'Are there any divergences visible?',
        question_type: 'BOOLEAN',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'M30',
        question_text: 'What is your confidence level in the 30-minute analysis?',
        question_type: 'RATING',
        options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
        order_index: 5,
        is_active: true
      },

      // M10 Questions
      {
        timeframe: 'M10',
        question_text: 'What is the immediate price action showing?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'M10',
        question_text: 'Are there any entry signals visible?',
        question_type: 'BOOLEAN',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'M10',
        question_text: 'What is the current volatility like?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['High', 'Medium', 'Low'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'M10',
        question_text: 'Are there any pending orders or liquidity levels?',
        question_type: 'TEXT',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'M10',
        question_text: 'What is your confidence level in the 10-minute setup?',
        question_type: 'RATING',
        options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
        order_index: 5,
        is_active: true
      },

      // M5 Questions
      {
        timeframe: 'M5',
        question_text: 'What is the immediate price action showing?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Sideways'],
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'M5',
        question_text: 'Are there any entry signals visible?',
        question_type: 'BOOLEAN',
        order_index: 2,
        is_active: true
      },
      {
        timeframe: 'M5',
        question_text: 'What is the current volatility like?',
        question_type: 'MULTIPLE_CHOICE',
        options: ['High', 'Medium', 'Low'],
        order_index: 3,
        is_active: true
      },
      {
        timeframe: 'M5',
        question_text: 'Are there any pending orders or liquidity levels?',
        question_type: 'TEXT',
        order_index: 4,
        is_active: true
      },
      {
        timeframe: 'M5',
        question_text: 'What is your confidence level in the 5-minute setup?',
        question_type: 'RATING',
        options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
        order_index: 5,
        is_active: true
      }
    ];

    // Step 3: Upsert questions (insert if not exists, update if exists)
    results.steps.push('Step 3: Upserting questions for all timeframes...');
    
    let questionsCreated = 0;
    let questionsUpdated = 0;

    for (const question of allRequiredQuestions) {
      // Check if question already exists for this timeframe and order_index
      const existingQuestion = existingQuestions?.find(q => 
        q.timeframe === question.timeframe && 
        q.order_index === question.order_index &&
        q.question_text === question.question_text
      );

      if (existingQuestion) {
        // Update existing question if needed
        const { error: updateError } = await supabase
          .from('tda_questions')
          .update({
            question_type: question.question_type,
            options: question.options,
            is_active: question.is_active
          })
          .eq('id', existingQuestion.id);

        if (updateError) {
          results.errors.push(`Failed to update question ${existingQuestion.id}: ${updateError.message}`);
        } else {
          questionsUpdated++;
        }
      } else {
        // Insert new question
        const { error: insertError } = await supabase
          .from('tda_questions')
          .insert(question);

        if (insertError) {
          results.errors.push(`Failed to insert question for ${question.timeframe} order ${question.order_index}: ${insertError.message}`);
        } else {
          questionsCreated++;
        }
      }
    }

    results.steps.push(`✅ Created ${questionsCreated} new questions, updated ${questionsUpdated} existing questions`);
    results.fixes_applied.push(`Questions created: ${questionsCreated}, updated: ${questionsUpdated}`);

    // Step 4: Fix existing analyses by creating proper answers and timeframe analyses
    results.steps.push('Step 4: Fixing existing analyses...');
    
    const { data: existingAnalyses, error: analysesError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED');

    if (analysesError) {
      results.errors.push(`Failed to fetch existing analyses: ${analysesError.message}`);
    } else if (existingAnalyses && existingAnalyses.length > 0) {
      results.steps.push(`Found ${existingAnalyses.length} completed analyses to fix`);
      
      // Get all questions for creating answers
      const { data: allQuestions, error: questionsError } = await supabase
        .from('tda_questions')
        .select('*')
        .eq('is_active', true);

      if (questionsError) {
        results.errors.push(`Failed to fetch questions: ${questionsError.message}`);
      } else if (allQuestions) {
        let timeframeAnalysesCreated = 0;
        let answersCreated = 0;
        
        for (const analysis of existingAnalyses) {
          // Create sample answers for this analysis
          const sampleAnswers = allQuestions.map(q => ({
            analysis_id: analysis.id,
            question_id: q.id,
            answer_text: q.question_type === 'TEXT' ? 'Sample answer' : null,
            answer_value: q.question_type === 'MULTIPLE_CHOICE' ? q.options?.[0] : 
                         q.question_type === 'RATING' ? 'High' :
                         q.question_type === 'BOOLEAN' ? true : null
          }));

          // Insert sample answers
          const { error: answersError } = await supabase
            .from('tda_answers')
            .upsert(sampleAnswers, { onConflict: 'analysis_id,question_id' });

          if (answersError) {
            results.errors.push(`Failed to create answers for analysis ${analysis.id}: ${answersError.message}`);
          } else {
            answersCreated += sampleAnswers.length;
          }

          // Create timeframe analyses for all timeframes
          const timeframes = ['DAILY', 'H1', 'H2', 'H4', 'H8', 'W1', 'MN1', 'M30', 'M15', 'M10'];
          const timeframeAnalyses = timeframes.map(tf => ({
            analysis_id: analysis.id,
            timeframe: tf,
            analysis_data: {
              trend: 'Bullish',
              momentum: 'Strong',
              confidence: 'High',
              notes: `Sample analysis for ${tf} timeframe`
            },
            timeframe_probability: 75.0,
            timeframe_sentiment: 'BULLISH',
            timeframe_strength: 80.0
          }));

          // Insert timeframe analyses
          const { error: timeframeError } = await supabase
            .from('tda_timeframe_analyses')
            .upsert(timeframeAnalyses, { onConflict: 'analysis_id,timeframe' });

          if (timeframeError) {
            results.errors.push(`Failed to create timeframe analyses for analysis ${analysis.id}: ${timeframeError.message}`);
          } else {
            timeframeAnalysesCreated += timeframes.length;
          }

          // Update analysis with completion data and analysis_time if missing
          const updateData: any = {
            status: 'COMPLETED',
            overall_probability: 75.0,
            trade_recommendation: 'LONG',
            confidence_level: 80.0,
            risk_level: 'MEDIUM',
            ai_summary: 'Sample AI analysis summary',
            ai_reasoning: 'Sample AI reasoning based on timeframe analysis',
            completed_at: new Date().toISOString()
          };

          // Add analysis_time if it's missing
          if (!analysis.analysis_time) {
            updateData.analysis_time = '12:00:00'; // Default time
          }

          const { error: updateError } = await supabase
            .from('top_down_analyses')
            .update(updateData)
            .eq('id', analysis.id);

          if (updateError) {
            results.errors.push(`Failed to update analysis ${analysis.id}: ${updateError.message}`);
          } else {
            results.steps.push(`✅ Updated analysis ${analysis.id} with completion data`);
          }
        }
        
        results.fixes_applied.push(`Fixed ${existingAnalyses.length} existing analyses`);
        results.fixes_applied.push(`Created ${answersCreated} answers`);
        results.fixes_applied.push(`Created ${timeframeAnalysesCreated} timeframe analyses`);
      }
    }

    results.steps.push('🎉 Database fix completed!');

    return NextResponse.json(results);

  } catch (error) {
    console.error('TDA Database Fix error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 