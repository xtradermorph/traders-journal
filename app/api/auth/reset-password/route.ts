import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';

// Password validation schema (same as registration)
const passwordResetSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  try {
    // Create a Supabase client for the current request
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get auth session from request cookies
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No active session found. Please request a new password reset.' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    
    // Validate the password data
    const validationResult = passwordResetSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid password data',
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const { password } = validationResult.data;

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({ 
      password: password 
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ 
        error: updateError.message || 'Failed to update password' 
      }, { status: 400 });
    }

    // Send confirmation email
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: session.user.email,
          subject: 'Password Reset Successful - Trader\'s Journal',
          type: 'passwordResetConfirmation',
          newPassword: password, // Include the new password in the email
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send confirmation email:', await emailResponse.text());
        // Don't fail the request if email fails, just log it
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the request if email fails, just log it
    }

    return NextResponse.json({ 
      success: true,
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
