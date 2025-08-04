import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function POST() {
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
      questions_created: 0
    };

    // Define all the questions that match the hardcoded IDs
    const allQuestions = [
      // Daily Questions
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
        question_text: 'Notes',
        question_type: 'TEXT',
        order_index: 8,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Candle / Chart Patterns',
        question_type: 'TEXT',
        order_index: 9,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Fibonacci: Swing Low',
        question_type: 'TEXT',
        order_index: 10,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Fibonacci: Swing High',
        question_type: 'TEXT',
        order_index: 11,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Waterline',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above', 'Below', 'At'],
        order_index: 12,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Positive', 'Negative', 'Zero'],
        order_index: 13,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Movement',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 14,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 15,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Lines: Notes',
        question_type: 'TEXT',
        order_index: 16,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Histogram: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Positive', 'Negative', 'Zero'],
        order_index: 17,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Histogram: Movement',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 18,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Histogram: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 19,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'MACD Histogram: Notes',
        question_type: 'TEXT',
        order_index: 20,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Condition',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Overbought', 'Oversold', 'Neutral'],
        order_index: 21,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 22,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Position',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Above 70', 'Below 30', 'Between 30-70'],
        order_index: 23,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 24,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'RSI: Notes',
        question_type: 'TEXT',
        order_index: 25,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'REI: Condition',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Overbought', 'Oversold', 'Neutral'],
        order_index: 26,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'REI: Direction',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Rising', 'Falling', 'Sideways'],
        order_index: 27,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'REI: Sentiment',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Bullish', 'Bearish', 'Neutral'],
        order_index: 28,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'REI: Notes',
        question_type: 'TEXT',
        order_index: 29,
        is_active: true
      },
      {
        timeframe: 'DAILY',
        question_text: 'Analysis',
        question_type: 'TEXT',
        order_index: 30,
        is_active: true
      },

      // H1 Questions
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

      // M15 Questions
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
      }
    ];

    results.steps.push(`Step 1: Inserting ${allQuestions.length} questions...`);

    // Insert all questions
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('tda_questions')
      .upsert(allQuestions, { onConflict: 'timeframe,order_index' })
      .select();

    if (insertError) {
      results.errors.push(`Failed to insert questions: ${insertError.message}`);
      return NextResponse.json(results, { status: 500 });
    }

    results.questions_created = insertedQuestions?.length || 0;
    results.steps.push(`✅ Successfully created/updated ${results.questions_created} questions`);

    // Verify the questions were created
    const { data: verifyQuestions, error: verifyError } = await supabase
      .from('tda_questions')
      .select('*')
      .eq('is_active', true)
      .order('timeframe, order_index');

    if (verifyError) {
      results.errors.push(`Failed to verify questions: ${verifyError.message}`);
    } else {
      results.steps.push(`✅ Verification: Found ${verifyQuestions?.length || 0} active questions in database`);
      results.final_data = {
        questions: verifyQuestions,
        timeframe_counts: {
          DAILY: verifyQuestions?.filter(q => q.timeframe === 'DAILY').length || 0,
          H1: verifyQuestions?.filter(q => q.timeframe === 'H1').length || 0,
          M15: verifyQuestions?.filter(q => q.timeframe === 'M15').length || 0
        }
      };
    }

    results.steps.push('🎉 Question population completed!');

    return NextResponse.json(results);

  } catch (error) {
    console.error('TDA Populate Questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 