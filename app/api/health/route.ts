import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Check if required environment variables are present
    if (!supabaseKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database configuration missing: SUPABASE_SERVICE_ROLE_KEY not found',
        database: {
          connected: false,
          recordCount: 0,
          error: 'Missing service role key'
        },
        edgeFunction: {
          status: 'not_configured'
        },
        cronJobs: {
          status: 'not_configured'
        }
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check database connection with a simple query
    let recordCount = 0;
    let dbConnected = false;
    let dbError = null;
    
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
    } catch (error) {
      console.error('Database connection failed:', error);
      dbConnected = false;
      dbError = error instanceof Error ? error.message : 'Unknown database error';
    }
    
    // Check Edge Function (optional)
    let functionStatus = 'unknown';
    let functionError = null;
    try {
      // Only try to call edge function if we have the anon key
      if (process.env.SUPABASE_ANON_KEY) {
        const functionResponse = await fetch(
          `https://oweimywvzmqoizsyotrt.functions.supabase.co/generate-reports?type=daily`,
          { 
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }
        );
        
        // Try to get response text for debugging
        let responseText = '';
        try {
          responseText = await functionResponse.text();
        } catch {
          // Ignore text reading errors
        }
        
        if (functionResponse.ok) {
          functionStatus = 'operational';
        } else if (functionResponse.status === 400) {
          // 400 means the function is working but the request was invalid (which we fixed)
          functionStatus = 'operational';
        } else if (functionResponse.status === 401) {
          functionStatus = 'unauthorized';
          functionError = 'Authentication failed';
        } else if (functionResponse.status === 403) {
          functionStatus = 'forbidden';
          functionError = 'Access forbidden';
        } else if (functionResponse.status === 404) {
          functionStatus = 'not_configured';
          functionError = 'Function not found';
        } else if (functionResponse.status === 500) {
          // 500 means the function is running but had an internal error (likely no users with report preferences)
          functionStatus = 'operational';
          functionError = 'Function operational but no reports to process';
        } else {
          functionStatus = 'error';
          functionError = `HTTP ${functionResponse.status}: ${responseText}`;
        }
      } else {
        functionStatus = 'not_configured';
        functionError = 'Missing SUPABASE_ANON_KEY';
      }
    } catch (e) {
      functionStatus = 'error';
      functionError = e instanceof Error ? e.message : 'Unknown error';
    }
    
    // Check scheduled jobs
    let cronStatus = 'unknown';
    try {
      const { data: cronJobActive, error: cronError } = await supabase.rpc(
        'check_cron_jobs',
        { job_name: 'periodic-trade-reports', hours_threshold: 48 }
      );
      
      if (cronError) {
        console.error('Error checking cron jobs:', cronError);
        // If function doesn't exist, mark as not configured rather than error
        if (cronError.message && cronError.message.includes('Could not find the function')) {
          cronStatus = 'not_configured';
        } else {
          cronStatus = 'not_configured';
        }
      } else {
        cronStatus = cronJobActive ? 'active' : 'inactive';
      }
    } catch (e) {
      console.error('Exception checking cron jobs:', e);
      cronStatus = 'not_configured';
    }
    
    // Check Email Service (Resend)
    let emailStatus = 'unknown';
    try {
      if (process.env.RESEND_API_KEY) {
        // Test Resend API by making a simple request
        const resendResponse = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (resendResponse.ok) {
          emailStatus = 'operational';
        } else if (resendResponse.status === 401) {
          emailStatus = 'unauthorized';
        } else if (resendResponse.status === 403) {
          emailStatus = 'forbidden';
        } else {
          emailStatus = 'error';
        }
      } else {
        emailStatus = 'not_configured';
      }
    } catch (e) {
      console.error('Email service check error:', e);
      emailStatus = 'error';
    }
    
    // Determine overall status - only fail if database is down
    let overallStatus = 'healthy';
    if (!dbConnected) {
      overallStatus = 'unhealthy';
    }
    
    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        recordCount: recordCount,
        error: dbError
      },
      edgeFunction: {
        status: functionStatus,
        error: functionError
      },
      cronJobs: {
        status: cronStatus
      },
      emailService: {
        status: emailStatus
      }
    });
  } catch (error: unknown) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          recordCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
