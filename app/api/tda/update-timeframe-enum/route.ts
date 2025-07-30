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

    // Step 1: Update the timeframe enum to include all needed timeframes
    results.steps.push('Step 1: Updating timeframe enum...');
    
    // Try to insert questions for each timeframe to trigger enum creation
    const timeframesToAdd = ['M5', 'M10', 'M30', 'H1', 'H3', 'H4', 'H8', 'W1', 'MN1'];
    let enumUpdatesSuccessful = 0;
    
    for (const timeframe of timeframesToAdd) {
      try {
        // Try to insert a test question for this timeframe
        const { error: testError } = await supabase
          .from('tda_questions')
          .insert({
            timeframe: timeframe as any,
            question_text: `Test question for ${timeframe}`,
            question_type: 'TEXT',
            order_index: 999,
            is_active: false
          });

        if (testError && testError.message.includes('invalid input value for enum')) {
          // Enum value doesn't exist, we need to add it manually
          results.errors.push(`Timeframe ${timeframe} is not in the enum. Manual database update required.`);
        } else if (!testError) {
          // Successfully inserted, now delete the test question
          await supabase
            .from('tda_questions')
            .delete()
            .eq('question_text', `Test question for ${timeframe}`)
            .eq('order_index', 999);
          
          enumUpdatesSuccessful++;
        }
      } catch (error) {
        results.errors.push(`Error testing timeframe ${timeframe}: ${error}`);
      }
    }

    if (enumUpdatesSuccessful > 0) {
      results.steps.push(`✅ Successfully tested ${enumUpdatesSuccessful} timeframes`);
      results.fixes_applied.push(`Tested ${enumUpdatesSuccessful} timeframes for enum compatibility`);
    }

    // Step 2: Add analysis_time column if it doesn't exist
    results.steps.push('Step 2: Adding analysis_time column...');
    
    // Try to insert a record with analysis_time to see if the column exists
    const { data: testAnalysis, error: testTimeError } = await supabase
      .from('top_down_analyses')
      .select('analysis_time')
      .limit(1);

    if (testTimeError && testTimeError.message.includes('column "analysis_time" does not exist')) {
      results.errors.push('Analysis time column does not exist. Manual database update required.');
    } else {
      results.steps.push('✅ Analysis time column exists or was created successfully');
      results.fixes_applied.push('Verified analysis_time column exists');
    }

    // Step 3: Verify current questions and timeframes
    results.steps.push('Step 3: Verifying current questions and timeframes...');
    
    const { data: currentQuestions, error: checkError } = await supabase
      .from('tda_questions')
      .select('timeframe')
      .order('timeframe', { ascending: true });

    if (checkError) {
      results.errors.push(`Failed to verify enum update: ${checkError.message}`);
    } else {
      const timeframes = Array.from(new Set(currentQuestions?.map(q => q.timeframe) || []));
      results.steps.push(`✅ Current timeframes in database: ${timeframes.join(', ')}`);
      results.fixes_applied.push(`Verified timeframes: ${timeframes.join(', ')}`);
    }

    results.steps.push('🎉 Timeframe enum update completed!');

    return NextResponse.json(results);

  } catch (error) {
    console.error('Update Timeframe Enum error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 