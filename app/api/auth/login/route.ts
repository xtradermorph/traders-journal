import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, turnstileToken } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Verify Turnstile token if provided
    if (turnstileToken) {
      console.log('Verifying Turnstile token...');
      
      // Check if secret key is available
      if (!process.env.TURNSTILE_SECRET_KEY) {
        console.error('TURNSTILE_SECRET_KEY is not set');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const clientIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

      const formData = new FormData();
      formData.append('secret', process.env.TURNSTILE_SECRET_KEY);
      formData.append('response', turnstileToken);
      formData.append('remoteip', clientIp);

      try {
        const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData
        });

        const turnstileResult = await turnstileResponse.json();
        console.log('Turnstile verification result:', turnstileResult);

        if (!turnstileResult.success) {
          console.error('Turnstile verification failed:', turnstileResult['error-codes']);
          return NextResponse.json(
            { error: 'Captcha verification failed' },
            { status: 400 }
          );
        }
      } catch (turnstileError) {
        console.error('Turnstile API error:', turnstileError);
        return NextResponse.json(
          { error: 'Captcha verification failed' },
          { status: 400 }
        );
      }
    } else {
      console.log('No Turnstile token provided, skipping verification');
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password
    });

    if (error) {
      let errorMessage = 'Authentication failed';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before logging in';
      } else {
        errorMessage = error.message;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    if (!data?.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 400 }
      );
    }

    // Get user profile
    let username = data.user.email?.split('@')[0] || 'user';
    
    try {
      const { data: profileData } = await supabase
        .rpc('get_user_profile', { user_id: data.user.id });

      if (profileData?.username) {
        username = profileData.username;
      }
    } catch (profileError) {
      // Use fallback username if profile fetch fails
      username = data.user.user_metadata?.username || 
                data.user.user_metadata?.name || 
                data.user.email?.split('@')[0] || 
                'user';
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
      username: username
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
