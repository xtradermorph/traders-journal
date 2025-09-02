import { NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


interface TestResults {
  timestamp: string;
  user_id: string;
  test_results: {
    steps: string[];
    final_data: Record<string, unknown>;
    errors?: string[];
  };
  errors?: string[];
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: TestResults = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      test_results: {
        steps: [],
        final_data: {}
      }
    };

    // Step 1: Create a test analysis
    results.test_results.steps.push('Step 1: Creating test analysis...');
    
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .insert({
        user_id: user.id,
        currency_pair: 'EURUSD',
        notes: 'Test analysis for debugging',
        status: 'DRAFT'
      })
      .select()
      .single();

    if (analysisError) {
      if (!results.test_results.errors) results.test_results.errors = [];
      results.test_results.errors.push(`Failed to create analysis: ${analysisError.message}`);
      return NextResponse.json(results, { status: 500 });
    }

    results.test_results.steps.push(`✅ Analysis created with ID: ${analysis.id}`);
    results.test_results.final_data.analysis = analysis;

    // Step 2: Create test questions if they don't exist
    results.test_results.steps.push('Step 2: Checking/creating test questions...');
    
    const testQuestions = [
      {
        timeframe: 'DAILY',
        question_text: 'Test Daily Question 1',
        question_type: 'TEXT',
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'H2',
        question_text: 'Test H2 Question 1',
        question_type: 'TEXT',
        order_index: 1,
        is_active: true
      },
      {
        timeframe: 'M15',
        question_text: 'Test M15 Question 1',
        question_type: 'TEXT',
        order_index: 1,
        is_active: true
      }
    ];

    const { data: questions, error: questionsError } = await supabase
      .from('tda_questions')
      .upsert(testQuestions, { onConflict: 'timeframe,order_index' })
      .select();

    if (questionsError) {
      if (!results.test_results.errors) results.test_results.errors = [];
      results.test_results.errors.push(`Failed to create questions: ${questionsError.message}`);
    } else {
      results.test_results.steps.push(`✅ Questions created/updated: ${questions?.length || 0} questions`);
      results.test_results.final_data.questions = questions;
    }

    // Step 3: Save test answers
    results.test_results.steps.push('Step 3: Saving test answers...');
    
    const testAnswers = questions?.map(q => ({
      analysis_id: analysis.id,
      question_id: q.id,
      answer_text: `Test answer for ${q.question_text}`,
      answer_value: { value: `Test answer for ${q.question_text}` }
    })) || [];

    if (testAnswers.length > 0) {
      const { error: answersError } = await supabase
        .from('tda_answers')
        .upsert(testAnswers, { onConflict: 'analysis_id,question_id' });

      if (answersError) {
        if (!results.test_results.errors) results.test_results.errors = [];
        results.test_results.errors.push(`Failed to save answers: ${answersError.message}`);
      } else {
        results.test_results.steps.push(`✅ Answers saved: ${testAnswers.length} answers`);
        results.test_results.final_data.answers = testAnswers;
      }
    }

    // Step 4: Save timeframe analyses
    results.test_results.steps.push('Step 4: Saving timeframe analyses...');
    
    const timeframeAnalyses = questions?.map(q => ({
      analysis_id: analysis.id,
      timeframe: q.timeframe,
      analysis_data: {
        questions: [q],
        answers: testAnswers.filter(a => a.question_id === q.id)
      },
      timeframe_probability: 75.0,
      timeframe_sentiment: 'BULLISH',
      timeframe_strength: 80.0
    })) || [];

    if (timeframeAnalyses.length > 0) {
      const { error: tfError } = await supabase
        .from('tda_timeframe_analyses')
        .upsert(timeframeAnalyses, { onConflict: 'analysis_id,timeframe' });

      if (tfError) {
        if (!results.test_results.errors) results.test_results.errors = [];
        results.test_results.errors.push(`Failed to save timeframe analyses: ${tfError.message}`);
      } else {
        results.test_results.steps.push(`✅ Timeframe analyses saved: ${timeframeAnalyses.length} timeframes`);
        results.test_results.final_data.timeframe_analyses = timeframeAnalyses;
      }
    }

    // Step 5: Complete the analysis
    results.test_results.steps.push('Step 5: Completing analysis...');
    
    const { error: completeError } = await supabase
      .from('top_down_analyses')
      .update({
        status: 'COMPLETED',
        overall_probability: 78.5,
        trade_recommendation: 'LONG',
        confidence_level: 85.0,
        risk_level: 'MEDIUM',
        ai_summary: 'Test analysis shows bullish sentiment across timeframes',
        ai_reasoning: 'This is a test analysis for debugging purposes',
        completed_at: new Date().toISOString()
      })
      .eq('id', analysis.id);

    if (completeError) {
      if (!results.test_results.errors) results.test_results.errors = [];
      results.test_results.errors.push(`Failed to complete analysis: ${completeError.message}`);
    } else {
      results.test_results.steps.push('✅ Analysis completed successfully');
    }

    // Step 6: Verify data retrieval
    results.test_results.steps.push('Step 6: Verifying data retrieval...');
    
    const { data: finalAnalysis, error: finalError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('id', analysis.id)
      .single();

    if (finalError) {
      if (!results.test_results.errors) results.test_results.errors = [];
      results.test_results.errors.push(`Failed to retrieve final analysis: ${finalError.message}`);
    } else {
      results.test_results.steps.push('✅ Final analysis retrieved successfully');
      results.test_results.final_data.final_analysis = finalAnalysis;
    }

    // Step 7: Test the main API endpoint
    results.test_results.steps.push('Step 7: Testing main API endpoint...');
    
    const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://tradersjournal.pro'}/api/tda?id=${analysis.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      results.test_results.steps.push('✅ Main API endpoint working correctly');
      results.test_results.final_data.api_response = apiData;
    } else {
      if (!results.test_results.errors) results.test_results.errors = [];
      results.test_results.errors.push(`Main API endpoint failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    results.test_results.steps.push('🎉 Test analysis completed!');

    return NextResponse.json(results);

  } catch (error) {
    console.error('TDA Test Analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 