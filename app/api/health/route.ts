import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check database connection with a simple query
    let recordCount = 0;
    let dbConnected = false;
    
    try {
      const { count, error } = await supabase
        .from('user_settings')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Database health check error:', error);
        // Try a different table if user_settings fails
        const { count: profilesCount, error: profilesError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (profilesError) {
          throw profilesError;
        }
        recordCount = profilesCount || 0;
      } else {
        recordCount = count || 0;
      }
      dbConnected = true;
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      dbConnected = false;
    }
    
    // Check Edge Function (optional)
    let functionStatus = 'unknown';
    try {
      const functionResponse = await fetch(
        `https://oweimywvzmqoizsyotrt.functions.supabase.co/generate-reports?type=test`,
        { 
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
          }
        }
      );
      functionStatus = functionResponse.ok ? 'operational' : 'error';
    } catch (e) {
      functionStatus = 'error';
    }
    
    // Check scheduled jobs
    let cronStatus = 'unknown';
    try {
      const { data: cronJobActive, error: cronError } = await supabase.rpc(
        'check_cron_jobs',
        { job_name: 'monthly-reports', hours_threshold: 48 }
      );
      
      if (cronError) {
        console.error('Error checking cron jobs:', cronError);
        // If function doesn't exist, mark as not configured rather than error
        if (cronError.message && cronError.message.includes('Could not find the function')) {
          cronStatus = 'not_configured';
        } else {
          cronStatus = 'error';
        }
      } else {
        cronStatus = cronJobActive ? 'active' : 'inactive';
      }
    } catch (e) {
      console.error('Exception checking cron jobs:', e);
      cronStatus = 'error';
    }
    
    // Determine overall status
    let overallStatus = 'healthy';
    if (functionStatus === 'error' || cronStatus === 'error') {
      overallStatus = 'unhealthy';
    }
    
    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        recordCount: recordCount
      },
      edgeFunction: {
        status: functionStatus
      },
      cronJobs: {
        status: cronStatus
      }
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
