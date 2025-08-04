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

    const body = await request.json();
    const { analysis_id, answers } = body;

    if (!analysis_id || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Verify analysis ownership
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .select('id')
      .eq('id', analysis_id)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Insert or update answers
    const { error: insertError } = await supabase
      .from('tda_answers')
      .upsert(answers, { onConflict: 'analysis_id,question_id' });

    if (insertError) {
      console.error('Answer insertion error:', insertError);
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Answers saved successfully',
      count: answers.length
    });

  } catch (error) {
    console.error('TDA Answers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysis_id');

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }

    // Verify analysis ownership
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .select('id')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Get answers for the analysis
    const { data: answers, error: answersError } = await supabase
      .from('tda_answers')
      .select('*')
      .eq('analysis_id', analysisId);

    if (answersError) {
      return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
    }

    return NextResponse.json({ answers: answers || [] });

  } catch (error) {
    console.error('TDA Answers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 