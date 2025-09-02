import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cleanupCompleteTDA } from '../../../lib/database-cleanup';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get auth session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analysisId } = await request.json();
    
    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }

    // Verify the user owns this analysis
    const { data: analysis, error: fetchError } = await supabase
      .from('top_down_analyses')
      .select('user_id')
      .eq('id', analysisId)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    if (analysis.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Clean up all TDA data including screenshots and announcements
    await cleanupCompleteTDA(analysisId);

    return NextResponse.json({ 
      success: true, 
      message: 'TDA analysis and all related data deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting TDA analysis:', error);
    return NextResponse.json({ 
      error: 'Failed to delete TDA analysis' 
    }, { status: 500 });
  }
} 