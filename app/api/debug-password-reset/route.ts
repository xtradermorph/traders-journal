import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Create a Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('=== DEBUG PASSWORD RESET ===');
    console.log('Code received:', code);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Test 1: Try exchangeCodeForSession
    console.log('Testing exchangeCodeForSession...');
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log('Exchange result:', {
      hasData: !!exchangeData,
      hasSession: !!exchangeData?.session,
      hasUser: !!exchangeData?.user,
      error: exchangeError?.message,
      errorCode: exchangeError?.status
    });

    // Test 2: Try verifyOtp
    console.log('Testing verifyOtp...');
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: code,
      type: 'recovery'
    });

    console.log('Verify result:', {
      hasData: !!verifyData,
      hasUser: !!verifyData?.user,
      error: verifyError?.message,
      errorCode: verifyError?.status
    });

    return NextResponse.json({
      success: true,
      debug: {
        code,
        exchangeResult: {
          hasData: !!exchangeData,
          hasSession: !!exchangeData?.session,
          hasUser: !!exchangeData?.user,
          error: exchangeError?.message,
          errorCode: exchangeError?.status
        },
        verifyResult: {
          hasData: !!verifyData,
          hasUser: !!verifyData?.user,
          error: verifyError?.message,
          errorCode: verifyError?.status
        }
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
