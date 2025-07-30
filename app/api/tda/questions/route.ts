import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active questions ordered by timeframe and order_index
    const { data: questions, error: questionsError } = await supabase
      .from('tda_questions')
      .select('*')
      .eq('is_active', true)
      .order('timeframe, order_index');

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    return NextResponse.json({ 
      questions: questions || [],
      count: questions?.length || 0
    });

  } catch (error) {
    console.error('TDA Questions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questions } = body;

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Insert or update questions
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('tda_questions')
      .upsert(questions, { onConflict: 'timeframe,order_index' })
      .select();

    if (insertError) {
      console.error('Question insertion error:', insertError);
      return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
    }

    return NextResponse.json({ 
      questions: insertedQuestions || [],
      count: insertedQuestions?.length || 0
    });

  } catch (error) {
    console.error('TDA Questions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 