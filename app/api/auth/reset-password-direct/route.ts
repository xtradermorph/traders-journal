import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Log to both console and return in response for debugging
    const logData: any = {};
    
    console.log('=== PASSWORD RESET API CALLED ===');
    const { code, token, accessToken, refreshToken, password } = await request.json();
    
    logData.receivedParams = { 
      code: !!code, 
      token: !!token, 
      accessToken: !!accessToken, 
      refreshToken: !!refreshToken,
      passwordLength: password?.length 
    };
    
    console.log('Received parameters:', logData.receivedParams);

    if (!password) {
      console.log('ERROR: No password provided');
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Create a Supabase client with anon key for code exchange
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Anon key exists:', !!anonKey);
    console.log('Service role key exists:', !!serviceRoleKey);
    
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Use anon key for code exchange, service role for admin operations
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let userId: string;
    let userEmail: string;

    if (code) {
      console.log('Processing code-based reset with code:', code);
      logData.processingCode = code;
      
      // For password recovery, we need to exchange the code for a session using anon key
      const { data, error: exchangeError } = await supabaseAnon.auth.exchangeCodeForSession(code);

      logData.exchangeResult = { 
        hasData: !!data, 
        hasSession: !!data?.session,
        hasUser: !!data?.user, 
        error: exchangeError?.message 
      };

      console.log('Code exchange result:', logData.exchangeResult);

      if (exchangeError || !data.session || !data.user) {
        console.error('Code exchange error:', exchangeError);
        logData.finalError = 'Code exchange failed: ' + (exchangeError?.message || 'No session or user data');
        return NextResponse.json(
          { 
            error: 'Invalid or expired reset link',
            debug: logData
          },
          { status: 400 }
        );
      }

      userId = data.user.id;
      userEmail = data.user.email || '';
      logData.userInfo = { userId, userEmail };
      console.log('Code exchange successful:', { userId, userEmail });
    } else if (token) {
      // Handle PKCE token flow - verify the token and get user info
      const { data, error: tokenError } = await supabaseAnon.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      });

      if (tokenError || !data.user) {
        console.error('Token verification error:', tokenError);
        return NextResponse.json(
          { error: 'Invalid or expired reset link' },
          { status: 400 }
        );
      }

      userId = data.user.id;
      userEmail = data.user.email || '';
    } else if (accessToken && refreshToken) {
      // Use the provided tokens to get user info
      const { data, error: tokenError } = await supabaseAnon.auth.getUser(accessToken);

      if (tokenError || !data.user) {
        console.error('Token validation error:', tokenError);
        return NextResponse.json(
          { error: 'Invalid or expired reset link' },
          { status: 400 }
        );
      }

      userId = data.user.id;
      userEmail = data.user.email || '';
    } else {
      return NextResponse.json(
        { error: 'Invalid reset link parameters' },
        { status: 400 }
      );
    }

    // Update password directly using admin API
    console.log('Updating password for user:', userId);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 400 }
      );
    }

    console.log('Password updated successfully');

    // Get username from profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    const username = profileData?.username || 'User';

    // Send confirmation email
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: userEmail,
          subject: 'Password Reset Successful - Trader\'s Journal',
          type: 'passwordResetConfirmation',
          username: username,
          newPassword: password,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send confirmation email');
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Password reset successfully',
      email: userEmail,
      username: username,
      debug: logData
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
