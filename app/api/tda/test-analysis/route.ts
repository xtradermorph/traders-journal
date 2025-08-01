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

    const testResults: any = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      steps: [],
      errors: [],
      final_data: {}
    };

    // Step 1: Create a test analysis
    testResults.steps.push('Step 1: Creating test analysis...');
    
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
      testResults.errors.push(`Failed to create analysis: ${analysisError.message}`);
      return NextResponse.json(testResults, { status: 500 });
    }

    testResults.steps.push(`✅ Analysis created with ID: ${analysis.id}`);
    testResults.final_data.analysis = analysis;

    // Step 2: Create test questions if they don't exist
    testResults.steps.push('Step 2: Checking/creating test questions...');
    
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
      testResults.errors.push(`Failed to create questions: ${questionsError.message}`);
    } else {
      testResults.steps.push(`✅ Questions created/updated: ${questions?.length || 0} questions`);
      testResults.final_data.questions = questions;
    }

    // Step 3: Save test answers
    testResults.steps.push('Step 3: Saving test answers...');
    
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
        testResults.errors.push(`Failed to save answers: ${answersError.message}`);
      } else {
        testResults.steps.push(`✅ Answers saved: ${testAnswers.length} answers`);
        testResults.final_data.answers = testAnswers;
      }
    }

    // Step 4: Save timeframe analyses
    testResults.steps.push('Step 4: Saving timeframe analyses...');
    
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
        testResults.errors.push(`Failed to save timeframe analyses: ${tfError.message}`);
      } else {
        testResults.steps.push(`✅ Timeframe analyses saved: ${timeframeAnalyses.length} timeframes`);
        testResults.final_data.timeframe_analyses = timeframeAnalyses;
      }
    }

    // Step 5: Complete the analysis
    testResults.steps.push('Step 5: Completing analysis...');
    
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
      testResults.errors.push(`Failed to complete analysis: ${completeError.message}`);
    } else {
      testResults.steps.push('✅ Analysis completed successfully');
    }

    // Step 6: Verify data retrieval
    testResults.steps.push('Step 6: Verifying data retrieval...');
    
    const { data: finalAnalysis, error: finalError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('id', analysis.id)
      .single();

    if (finalError) {
      testResults.errors.push(`Failed to retrieve final analysis: ${finalError.message}`);
    } else {
      testResults.steps.push('✅ Final analysis retrieved successfully');
      testResults.final_data.final_analysis = finalAnalysis;
    }

    // Step 7: Test the main API endpoint
    testResults.steps.push('Step 7: Testing main API endpoint...');
    
    const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tda?id=${analysis.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      testResults.steps.push('✅ Main API endpoint working correctly');
      testResults.final_data.api_response = apiData;
    } else {
      testResults.errors.push(`Main API endpoint failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    testResults.steps.push('🎉 Test analysis completed!');

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('TDA Test Analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 