import { NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export async function POST() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      fixes_applied: [] as string[],
      steps: [] as string[],
      errors: [] as string[]
    };

    // Step 1: Check current questions
    results.steps.push('Step 1: Checking current questions...');
    
    const { data: currentQuestions, error: checkError } = await supabase
      .from('tda_questions')
      .select('*')
      .limit(5);

    if (checkError) {
      results.errors.push(`Failed to check questions: ${checkError.message}`);
      return NextResponse.json(results, { status: 500 });
    }

    results.steps.push(`✅ Found ${currentQuestions?.length || 0} existing questions`);
    results.fixes_applied.push(`Current questions: ${currentQuestions?.length || 0}`);

    // Step 2: Try to insert just one question
    results.steps.push('Step 2: Testing question insertion...');
    
    const testQuestion = {
      timeframe: 'DAILY',
      question_text: 'Test Question',
      question_type: 'TEXT',
      order_index: 1,
      is_active: true
    };

    const { data: insertedQuestion, error: insertError } = await supabase
      .from('tda_questions')
      .insert(testQuestion)
      .select()
      .single();

    if (insertError) {
      results.errors.push(`Failed to insert test question: ${insertError.message}`);
      return NextResponse.json(results, { status: 500 });
    }

    results.steps.push(`✅ Successfully inserted test question: ${insertedQuestion?.id}`);
    results.fixes_applied.push(`Test question inserted: ${insertedQuestion?.id}`);

    // Step 3: Clean up test question
    results.steps.push('Step 3: Cleaning up test question...');
    
    const { error: deleteError } = await supabase
      .from('tda_questions')
      .delete()
      .eq('id', insertedQuestion.id);

    if (deleteError) {
      results.errors.push(`Failed to delete test question: ${deleteError.message}`);
    } else {
      results.steps.push('✅ Test question cleaned up');
    }

    results.steps.push('🎉 Simple fix test completed!');

    return NextResponse.json(results);

  } catch (error) {
    console.error('Simple Fix error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 