import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export async function POST(request: NextRequest) {
  try {
    const { username, email, password, turnstileToken } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase client with cookie support
    const supabase = createRouteHandlerClient({ cookies });

    // Prepare registration options - only include captchaToken if provided
    const signUpOptions: any = {
      email: email.toLowerCase().trim(),
      password: password,
      options: {
        data: {
          username: username
        },
        emailRedirectTo: `${request.headers.get('origin')}/login`,
      }
    };

    // Only add captchaToken if it's provided (development bypass)
    if (turnstileToken) {
      signUpOptions.options.captchaToken = turnstileToken;
    }

    // Register with Supabase
    const { data, error } = await supabase.auth.signUp(signUpOptions);

    if (error) {
      let errorMessage = 'Registration failed';
      
      if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists';
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address';
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
        { error: 'Registration failed' },
        { status: 400 }
      );
    }

    // Create profile manually
    try {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: username,
        email: email.toLowerCase().trim(),
        created_at: new Date().toISOString()
      });
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail registration if profile creation fails
      }
    } catch (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail registration if profile creation fails
    }

    return NextResponse.json({
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
