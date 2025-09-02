import { NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export async function POST() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      steps: [] as string[],
      errors: [] as string[],
      questions_updated: 0
    };

    results.steps.push('Starting TDA questions fix...');

    // First, let's check what questions currently exist
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('tda_questions')
      .select('*')
      .eq('timeframe', 'DAILY')
      .eq('is_active', true)
      .order('order_index');

    if (fetchError) {
      results.errors.push(`Error fetching existing questions: ${fetchError.message}`);
      return NextResponse.json(results, { status: 500 });
    }

    results.steps.push(`Found ${existingQuestions?.length || 0} existing DAILY questions`);

    // Find the specific questions that need to be updated
    const previousCandleQuestion = existingQuestions?.find(q => 
      q.question_text === 'Previous Candle' || 
      q.question_text === 'Previous Candle Colour' ||
      q.question_text.includes('Previous Candle')
    );

    const pivotRangeQuestion = existingQuestions?.find(q => 
      q.question_text === 'Pivot Range' || 
      q.question_text === "Today's Pivot Point Range" ||
      q.question_text.includes('Pivot')
    );

    // Update Previous Candle question
    if (previousCandleQuestion) {
      const { error: updateError } = await supabase
        .from('tda_questions')
        .update({
          question_text: 'Previous Candle Colour',
          question_type: 'MULTIPLE_CHOICE',
          options: ['Red', 'Green'],
          updated_at: new Date().toISOString()
        })
        .eq('id', previousCandleQuestion.id);

      if (updateError) {
        results.errors.push(`Failed to update Previous Candle question: ${updateError.message}`);
      } else {
        results.questions_updated++;
        results.steps.push('Updated Previous Candle Colour question with Red/Green options');
      }
    } else {
      results.steps.push('Previous Candle question not found, will create new one');
      
      // Create new Previous Candle question
      const { error: insertError } = await supabase
        .from('tda_questions')
        .insert({
          timeframe: 'DAILY',
          question_text: 'Previous Candle Colour',
          question_type: 'MULTIPLE_CHOICE',
          options: ['Red', 'Green'],
          order_index: 6,
          is_active: true,
          required: true
        });

      if (insertError) {
        results.errors.push(`Failed to create Previous Candle question: ${insertError.message}`);
      } else {
        results.questions_updated++;
        results.steps.push('Created new Previous Candle Colour question');
      }
    }

    // Update Pivot Range question
    if (pivotRangeQuestion) {
      const { error: updateError } = await supabase
        .from('tda_questions')
        .update({
          question_text: "Today's Pivot Point Range",
          question_type: 'MULTIPLE_CHOICE',
          options: ['MidS2 to MidR1', 'MidS1 to MidR2'],
          updated_at: new Date().toISOString()
        })
        .eq('id', pivotRangeQuestion.id);

      if (updateError) {
        results.errors.push(`Failed to update Pivot Range question: ${updateError.message}`);
      } else {
        results.questions_updated++;
        results.steps.push('Updated Pivot Point Range question with correct options');
      }
    } else {
      results.steps.push('Pivot Range question not found, will create new one');
      
      // Create new Pivot Range question
      const { error: insertError } = await supabase
        .from('tda_questions')
        .insert({
          timeframe: 'DAILY',
          question_text: "Today's Pivot Point Range",
          question_type: 'MULTIPLE_CHOICE',
          options: ['MidS2 to MidR1', 'MidS1 to MidR2'],
          order_index: 7,
          is_active: true,
          required: true
        });

      if (insertError) {
        results.errors.push(`Failed to create Pivot Range question: ${insertError.message}`);
      } else {
        results.questions_updated++;
        results.steps.push('Created new Pivot Point Range question');
      }
    }

    // Verify the updates
    const { data: updatedQuestions, error: verifyError } = await supabase
      .from('tda_questions')
      .select('*')
      .eq('timeframe', 'DAILY')
      .eq('is_active', true)
      .order('order_index');

    if (verifyError) {
      results.errors.push(`Error verifying updates: ${verifyError.message}`);
    } else {
      results.steps.push(`Verification complete. Total DAILY questions: ${updatedQuestions?.length || 0}`);
      
      // Log the updated questions for verification
      const previousCandleUpdated = updatedQuestions?.find(q => q.question_text === 'Previous Candle Colour');
      const pivotRangeUpdated = updatedQuestions?.find(q => q.question_text === "Today's Pivot Point Range");
      
      if (previousCandleUpdated) {
        results.steps.push(`Previous Candle options: ${JSON.stringify(previousCandleUpdated.options)}`);
      }
      
      if (pivotRangeUpdated) {
        results.steps.push(`Pivot Range options: ${JSON.stringify(pivotRangeUpdated.options)}`);
      }
    }

    results.steps.push('TDA questions fix completed successfully!');
    
    return NextResponse.json(results);

  } catch (error) {
    console.error('TDA Questions Fix error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 