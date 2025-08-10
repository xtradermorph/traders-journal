import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, turnstileToken } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase client with cookie support
    const supabase = createRouteHandlerClient({ cookies });

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password,
      options: {
        captchaToken: turnstileToken // Pass Turnstile token to Supabase
      }
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
