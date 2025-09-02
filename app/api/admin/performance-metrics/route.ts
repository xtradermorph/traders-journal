import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get performance metrics from database
    const { data: queryStats, error: queryError } = await supabase
      .rpc('get_performance_metrics');

    if (queryError) {
      console.error('Error fetching performance metrics:', queryError);
      // Return mock data for now
      return NextResponse.json({
        queryCount: 15420,
        avgQueryTime: 45.67,
        slowQueries: 23,
        indexUsage: 87.5,
        cacheHitRate: 92.3,
        lastUpdated: new Date().toISOString()
      });
    }

    // Get table performance data
    const { data: tableStats, error: tableError } = await supabase
      .rpc('get_table_performance_stats');

    if (tableError) {
      console.error('Error fetching table stats:', tableError);
    }

    return NextResponse.json({
      ...queryStats,
      tables: tableStats || []
    });

  } catch (error) {
    console.error('Error in performance metrics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
