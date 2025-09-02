import { NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }



    const body = await request.json();
    const { analysis_id } = body;

    if (!analysis_id) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }

    // Get the analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('id', analysis_id)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Get all answers for this analysis
    const { data: answers, error: answersError } = await supabase
      .from('tda_answers')
      .select('*')
      .eq('analysis_id', analysis_id);

    if (answersError) {
      return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
    }

    // Group answers by timeframe based on question_id patterns
    const timeframeGroups: Record<string, Array<{ question_id: string; answer_text?: string; answer_value?: string }>> = {};
    
    answers?.forEach(answer => {
      const questionId = answer.question_id;
      
      // Determine timeframe based on question_id pattern
      let timeframe = '';
      if (questionId.startsWith('daily_')) {
        timeframe = 'DAILY';
      } else if (questionId.startsWith('hour_')) {
        timeframe = 'H1';
      } else if (questionId.startsWith('min15_')) {
        timeframe = 'M15';
      } else if (questionId.startsWith('min5_')) {
        timeframe = 'M5';
      }
      
      if (timeframe) {
        if (!timeframeGroups[timeframe]) {
          timeframeGroups[timeframe] = [];
        }
        timeframeGroups[timeframe].push(answer);
      }
    });

    // Create timeframe analyses
    const timeframeAnalyses = Object.entries(timeframeGroups).map(([timeframe, answers]) => ({
      analysis_id: analysis_id,
      timeframe: timeframe,
      analysis_data: {
        questions: answers.map(a => ({ id: a.question_id })),
        answers: answers.map(a => ({
          question_id: a.question_id,
          answer_text: a.answer_text,
          answer_value: a.answer_value
        }))
      },
      created_at: analysis.created_at,
      updated_at: new Date().toISOString()
    }));

    if (timeframeAnalyses.length === 0) {
      return NextResponse.json({ 
        message: 'No timeframe data found to create',
        analysis_id: analysis_id
      });
    }

    // Insert timeframe analyses
    const { error: insertError } = await supabase
      .from('tda_timeframe_analyses')
      .upsert(timeframeAnalyses, { onConflict: 'analysis_id,timeframe' });

    if (insertError) {
      console.error('Timeframe analysis insertion error:', insertError);
      return NextResponse.json({ error: 'Failed to create timeframe analyses' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Timeframe analyses created successfully',
      analysis_id: analysis_id,
      timeframes_created: timeframeAnalyses.length,
      timeframes: Object.keys(timeframeGroups)
    });

  } catch (error) {
    console.error('Fix timeframes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 