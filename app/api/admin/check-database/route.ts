import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      checks: [],
      errors: [],
      tables: {}
    };

    // Check if user_settings table exists and has data
    try {
      const { data: userSettings, error: userSettingsError } = await supabase
        .from('user_settings')
        .select('*', { count: 'exact', head: true });

      if (userSettingsError) {
        results.errors.push(`user_settings table error: ${userSettingsError.message}`);
        results.tables.user_settings = { exists: false, error: userSettingsError.message };
      } else {
        results.tables.user_settings = { 
          exists: true, 
          count: userSettings?.length || 0,
          hasData: (userSettings?.length || 0) > 0
        };
        results.checks.push('user_settings table accessible');
      }
    } catch (error) {
      results.errors.push(`user_settings table exception: ${error}`);
      results.tables.user_settings = { exists: false, error: error };
    }

    // Check profiles table
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profilesError) {
        results.errors.push(`profiles table error: ${profilesError.message}`);
        results.tables.profiles = { exists: false, error: profilesError.message };
      } else {
        results.tables.profiles = { 
          exists: true, 
          count: profiles?.length || 0,
          hasData: (profiles?.length || 0) > 0
        };
        results.checks.push('profiles table accessible');
      }
    } catch (error) {
      results.errors.push(`profiles table exception: ${error}`);
      results.tables.profiles = { exists: false, error: error };
    }

    // Check trades table
    try {
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true });

      if (tradesError) {
        results.errors.push(`trades table error: ${tradesError.message}`);
        results.tables.trades = { exists: false, error: tradesError.message };
      } else {
        results.tables.trades = { 
          exists: true, 
          count: trades?.length || 0,
          hasData: (trades?.length || 0) > 0
        };
        results.checks.push('trades table accessible');
      }
    } catch (error) {
      results.errors.push(`trades table exception: ${error}`);
      results.tables.trades = { exists: false, error: error };
    }

    // Check if user has admin role
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        results.errors.push(`profile role check error: ${profileError.message}`);
        results.userRole = 'unknown';
      } else {
        results.userRole = profile?.role || 'no_role';
        results.checks.push(`user role: ${results.userRole}`);
      }
    } catch (error) {
      results.errors.push(`profile role check exception: ${error}`);
      results.userRole = 'error';
    }

    // Check RLS policies
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies_info');

      if (policiesError) {
        results.errors.push(`policies check error: ${policiesError.message}`);
        results.policies = 'unavailable';
      } else {
        results.policies = policies || 'no_policies_found';
        results.checks.push('RLS policies checked');
      }
    } catch (error) {
      results.errors.push(`policies check exception: ${error}`);
      results.policies = 'error';
    }

    results.summary = {
      totalChecks: results.checks.length,
      totalErrors: results.errors.length,
      tablesExist: Object.values(results.tables).filter((t: any) => t.exists).length,
      isAdmin: results.userRole?.toUpperCase() === 'ADMIN'
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 