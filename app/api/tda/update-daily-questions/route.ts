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
      questions_updated: 0,
      questions_created: 0
    };

    // First, let's check what questions currently exist for DAILY timeframe
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('tda_questions')
      .select('*')
      .eq('timeframe', 'DAILY')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching existing questions:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing questions' }, { status: 500 });
    }

    results.steps.push(`Found ${existingQuestions?.length || 0} existing DAILY questions`);

    // Check if we need to replace any old questions
    const oldQuestionsToReplace = [
      'Price Location in Pivot Range',
      'Drive or Exhaustion'
    ];

    const questionsToUpdate = existingQuestions?.filter(q => 
      oldQuestionsToReplace.includes(q.question_text)
    ) || [];

    results.steps.push(`Found ${questionsToUpdate.length} old questions to replace`);

    // Update or create the new questions
    const newQuestions = [
      {
        question_text: 'Previous Candle Colour',
        question_type: 'MULTIPLE_CHOICE',
        options: ['Red', 'Green'],
        order_index: 6
      },
      {
        question_text: "Today's Pivot Point Range",
        question_type: 'MULTIPLE_CHOICE',
        options: ['MidS2 to MidR1', 'MidS1 to MidR2'],
        order_index: 7
      }
    ];

    for (const newQuestion of newQuestions) {
      // Check if this question already exists
      const existingQuestion = existingQuestions?.find(q => 
        q.question_text === newQuestion.question_text
      );

      if (existingQuestion) {
        // Update existing question
        const { error: updateError } = await supabase
          .from('tda_questions')
          .update({
            question_type: newQuestion.question_type,
            options: newQuestion.options,
            order_index: newQuestion.order_index,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingQuestion.id);

        if (updateError) {
          results.errors.push(`Failed to update question "${newQuestion.question_text}": ${updateError.message}`);
        } else {
          results.questions_updated++;
          results.steps.push(`Updated question: ${newQuestion.question_text}`);
        }
      } else {
        // Create new question
        const { error: insertError } = await supabase
          .from('tda_questions')
          .insert({
            timeframe: 'DAILY',
            question_text: newQuestion.question_text,
            question_type: newQuestion.question_type,
            options: newQuestion.options,
            order_index: newQuestion.order_index,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          results.errors.push(`Failed to create question "${newQuestion.question_text}": ${insertError.message}`);
        } else {
          results.questions_created++;
          results.steps.push(`Created question: ${newQuestion.question_text}`);
        }
      }
    }

    // Deactivate old questions that should be replaced
    for (const oldQuestion of questionsToUpdate) {
      const { error: deactivateError } = await supabase
        .from('tda_questions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', oldQuestion.id);

      if (deactivateError) {
        results.errors.push(`Failed to deactivate old question "${oldQuestion.question_text}": ${deactivateError.message}`);
      } else {
        results.steps.push(`Deactivated old question: ${oldQuestion.question_text}`);
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Update DAILY questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 