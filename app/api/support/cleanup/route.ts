import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZWlteXd2em1xb2l6c3lvdHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI4NDU3NCwiZXhwIjoyMDY0ODYwNTc0fQ.5sC0t0GshmS2_vy3X-w82jcRCFvvxjILGgb6phOWXwE';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// This endpoint can be called by a cron job or manually by an admin
export async function POST(request: Request) {
  try {
    // Get auth session from request cookies
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get request body
    const { olderThanDays = 30, status = ['resolved', 'closed'] } = await request.json();
    
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffDateString = cutoffDate.toISOString();

    // Delete old resolved/closed support requests
    const { error, count } = await supabase
      .from('support_requests')
      .delete({ count: 'exact' })
      .in('status', status)
      .lt('updated_at', cutoffDateString);

    if (error) {
      console.error('Error cleaning up support requests:', error);
      return NextResponse.json({ error: 'Failed to clean up support requests' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully cleaned up ${count} old support requests`,
      deletedCount: count
    });
  } catch (error) {
    console.error('Error in support cleanup API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
