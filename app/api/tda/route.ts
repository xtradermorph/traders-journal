import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


// Force dynamic runtime to prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('id');
    const status = searchParams.get('status');
    const currencyPair = searchParams.get('currency_pair');

    if (analysisId) {
      // Get specific analysis with all related data
      const { data: analysis, error: analysisError } = await supabase
        .from('top_down_analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', user.id)
        .single();

      if (analysisError) {
        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
      }

      // Get timeframe analyses
      const { data: timeframeAnalyses, error: timeframeError } = await supabase
        .from('tda_timeframe_analyses')
        .select('*')
        .eq('analysis_id', analysisId);

      if (timeframeError) {
        return NextResponse.json({ error: 'Failed to fetch timeframe analyses' }, { status: 500 });
      }

      // Get answers
      const { data: answers, error: answersError } = await supabase
        .from('tda_answers')
        .select('*')
        .eq('analysis_id', analysisId);

      if (answersError) {
        return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
      }

      // Get questions
      const { data: questions, error: questionsError } = await supabase
        .from('tda_questions')
        .select('*')
        .eq('is_active', true)
        .order('timeframe, order_index');

      if (questionsError) {
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
      }

      // Get screenshots
      const { data: screenshots, error: screenshotsError } = await supabase
        .from('tda_screenshots')
        .select('*')
        .eq('analysis_id', analysisId);

      if (screenshotsError) {
        return NextResponse.json({ error: 'Failed to fetch screenshots' }, { status: 500 });
      }

      // Get announcements
      const { data: announcements, error: announcementsError } = await supabase
        .from('tda_announcements')
        .select('*')
        .eq('analysis_id', analysisId);

      if (announcementsError) {
        return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
      }

      return NextResponse.json({
        analysis,
        timeframe_analyses: timeframeAnalyses || [],
        answers: answers || [],
        questions: questions || [],
        screenshots: screenshots || [],
        announcements: announcements || []
      });

    } else {
      // Get list of analyses
      let query = supabase
        .from('top_down_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (currencyPair) {
        query = query.eq('currency_pair', currencyPair);
      }

      const { data: analyses, error } = await query;

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
      }

      return NextResponse.json({ analyses: analyses || [] });
    }

  } catch (error) {
    console.error('TDA GET error:', error);
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
    const { currency_pair, notes, analysis_date, analysis_time } = body;

    if (!currency_pair) {
      return NextResponse.json({ error: 'Currency pair is required' }, { status: 400 });
    }

    // Create new analysis with timestamp data
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .insert({
        user_id: user.id,
        currency_pair,
        notes,
        analysis_date: analysis_date || new Date().toISOString().split('T')[0],
        analysis_time: analysis_time || null, // Save the time component
        status: 'DRAFT' // Create as draft initially
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Analysis creation error:', analysisError);
      return NextResponse.json({ error: 'Failed to create analysis' }, { status: 500 });
    }

    // Log the creation
    await supabase
      .from('tda_analysis_history')
      .insert({
        analysis_id: analysis.id,
        action: 'CREATED',
        performed_by: user.id
      });

    return NextResponse.json({ analysis }, { status: 201 });

  } catch (error) {
    console.error('TDA POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysis_id, updates } = body;

    if (!analysis_id) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existingAnalysis, error: fetchError } = await supabase
      .from('top_down_analyses')
      .select('id')
      .eq('id', analysis_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingAnalysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Update analysis
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from('top_down_analyses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysis_id)
      .select()
      .single();

    if (updateError) {
      console.error('Analysis update error:', updateError);
      return NextResponse.json({ error: 'Failed to update analysis' }, { status: 500 });
    }

    // Log the update
    await supabase
      .from('tda_analysis_history')
      .insert({
        analysis_id: analysis_id,
        action: 'UPDATED',
        changes: updates,
        performed_by: user.id
      });

    return NextResponse.json({ analysis: updatedAnalysis });

  } catch (error) {
    console.error('TDA PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('id');

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existingAnalysis, error: fetchError } = await supabase
      .from('top_down_analyses')
      .select('id')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingAnalysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Explicitly delete all associated data to ensure complete cleanup
    // Delete screenshots first (if table exists)
    try {
      await supabase
        .from('tda_screenshots')
        .delete()
        .eq('analysis_id', analysisId);
    } catch (error) {
      console.log('Screenshots table may not exist or already empty:', error);
    }

    // Delete announcements (if table exists)
    try {
      await supabase
        .from('tda_announcements')
        .delete()
        .eq('analysis_id', analysisId);
    } catch (error) {
      console.log('Announcements table may not exist or already empty:', error);
    }

    // Delete answers (should cascade, but explicit for safety)
    try {
      await supabase
        .from('tda_answers')
        .delete()
        .eq('analysis_id', analysisId);
    } catch (error) {
      console.log('Answers deletion error:', error);
    }

    // Delete timeframe analyses (should cascade, but explicit for safety)
    try {
      await supabase
        .from('tda_timeframe_analyses')
        .delete()
        .eq('analysis_id', analysisId);
    } catch (error) {
      console.log('Timeframe analyses deletion error:', error);
    }

    // Delete analysis history (should cascade, but explicit for safety)
    try {
      await supabase
        .from('tda_analysis_history')
        .delete()
        .eq('analysis_id', analysisId);
    } catch (error) {
      console.log('Analysis history deletion error:', error);
    }

    // Finally delete the main analysis
    const { error: deleteError } = await supabase
      .from('top_down_analyses')
      .delete()
      .eq('id', analysisId);

    if (deleteError) {
      console.error('Analysis deletion error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Analysis and all associated data deleted successfully' });

  } catch (error) {
    console.error('TDA DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 