import { NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysis_id, timeframe_analyses } = body;

    if (!analysis_id || !timeframe_analyses || !Array.isArray(timeframe_analyses)) {
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

    // Insert or update timeframe analyses
    const { error: insertError } = await supabase
      .from('tda_timeframe_analyses')
      .upsert(timeframe_analyses, { onConflict: 'analysis_id,timeframe' });

    if (insertError) {
      console.error('Timeframe analysis insertion error:', insertError);
      return NextResponse.json({ error: 'Failed to save timeframe analyses' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Timeframe analyses saved successfully',
      count: timeframe_analyses.length
    });

  } catch (error) {
    console.error('TDA Timeframe Analyses POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    console.log('TDA Timeframe Analyses GET request received');
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    if (!user) {
      console.error('No user found');
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysis_id');

    if (!analysisId) {
      console.error('No analysis_id provided');
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }

    console.log(`Fetching timeframes for analysis: ${analysisId}, user: ${user.id}`);

    // Verify analysis ownership
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .select('id')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (analysisError) {
      console.error('Analysis ownership check error:', analysisError);
      return NextResponse.json({ error: 'Failed to verify analysis ownership' }, { status: 500 });
    }
    
    if (!analysis) {
      console.error(`Analysis not found or not owned by user: ${analysisId}`);
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Get timeframe analyses for the analysis
    const { data: timeframeAnalyses, error: timeframeError } = await supabase
      .from('tda_timeframe_analyses')
      .select('*')
      .eq('analysis_id', analysisId);

    if (timeframeError) {
      console.error('Timeframe analyses fetch error:', timeframeError);
      return NextResponse.json({ error: 'Failed to fetch timeframe analyses' }, { status: 500 });
    }

    console.log(`Successfully fetched ${timeframeAnalyses?.length || 0} timeframe analyses`);
    return NextResponse.json({ timeframe_analyses: timeframeAnalyses || [] });

  } catch (error) {
    console.error('TDA Timeframe Analyses GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 