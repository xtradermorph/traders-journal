import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, username, newPassword } = await request.json();

    if (!email || !username || !newPassword) {
      return NextResponse.json(
        { error: 'Email, username, and new password are required' },
        { status: 400 }
      );
    }

    // Send confirmation email using Supabase Edge Function
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Password Reset Successful - Trader\'s Journal',
        type: 'passwordResetConfirmation',
        username: username,
        newPassword: newPassword,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send confirmation email:', errorText);
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Password reset confirmation email sent successfully' 
    });

  } catch (error) {
    console.error('Password confirmation email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

