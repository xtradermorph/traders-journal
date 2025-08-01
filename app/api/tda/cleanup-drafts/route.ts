import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all DRAFT analyses for the current user
    const { data: deletedAnalyses, error: deleteError } = await supabase
      .from('top_down_analyses')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'DRAFT')
      .select('id');

    if (deleteError) {
      console.error('Draft cleanup error:', deleteError);
      return NextResponse.json({ error: 'Failed to cleanup drafts' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Drafts cleaned up successfully',
      deletedCount: deletedAnalyses?.length || 0
    });

  } catch (error) {
    console.error('Draft cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 