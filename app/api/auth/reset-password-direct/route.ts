import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { code, token, accessToken, refreshToken, password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Create a Supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let userId: string;
    let userEmail: string;

    if (code) {
      // For server-side password reset with code, we need to verify the code
      // and get user info without creating a session
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: code,
        type: 'recovery'
      });

      if (verifyError || !data.user) {
        console.error('Code verification error:', verifyError);
        return NextResponse.json(
          { error: 'Invalid or expired reset link' },
          { status: 400 }
        );
      }

      userId = data.user.id;
      userEmail = data.user.email || '';
    } else if (token) {
      // Handle PKCE token flow - verify the token and get user info
      const { data, error: tokenError } = await supabase.auth.verifyOtp({
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
      const { data, error: tokenError } = await supabase.auth.getUser(accessToken);

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
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 400 }
      );
    }

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
      username: username
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
