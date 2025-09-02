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

    // Get security events from audit logs
    const { data: events, error: eventsError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        severity,
        category,
        ip_address,
        user_agent,
        created_at,
        metadata
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (eventsError) {
      console.error('Error fetching security events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch security events' }, { status: 500 });
    }

    // Filter for security-related events
    const securityEvents = events?.filter(event => 
      event.category === 'SECURITY' || 
      event.category === 'AUTHENTICATION' ||
      event.severity === 'HIGH' ||
      event.severity === 'CRITICAL'
    ) || [];

    return NextResponse.json({
      events: securityEvents,
      total: securityEvents.length
    });

  } catch (error) {
    console.error('Error in security events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
