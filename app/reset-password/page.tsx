"use client"

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { LOGO_CONFIG } from '@/lib/logo-config';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Check if we have the reset token
    const token = searchParams.get('token');

    console.log('Reset password page loaded with token:', !!token);

    if (token) {
      // Validate the token by checking if it exists and is not expired
      validateResetToken(token);
    } else {
      console.log('No reset token found');
      setError('Invalid reset link. Please check your email or request a new password reset.');
      setIsValidToken(false);
    }
  }, [searchParams]);

  const validateResetToken = async (token: string) => {
    try {
      // Check if the token exists and is valid
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single();

      if (error || !data) {
        console.error('Token validation error:', error);
        setError('Invalid or expired reset link. Please request a new password reset.');
        setIsValidToken(false);
        return;
      }

      // Check if token is expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        console.log('Token expired');
        setError('Reset link has expired. Please request a new password reset.');
        setIsValidToken(false);
        return;
      }

      console.log('Token validation successful');
      setEmail(data.email);
      setIsValidToken(true);
      setError('');
    } catch (error) {
      console.error('Token validation failed:', error);
      setError('Invalid reset link. Please request a new password reset.');
      setIsValidToken(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = searchParams.get('token');
      if (!token) {
        throw new Error('No reset token found');
      }

      // Update the user's password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (updateError) {
        throw updateError;
      }

      // Mark the token as used
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);

      // Send confirmation email via Resend
      try {
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resend`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            subject: 'Password Reset Successful - Trader\'s Journal',
            type: 'passwordResetConfirmation',
            newPassword: password
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

      toast({
        id: `password-reset-success-${Date.now()}`,
        title: 'Success',
        description: 'Your password has been reset successfully. You can now log in with your new password.'
      });

      // Redirect to login page
      router.push('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        id: `password-reset-error-${Date.now()}`,
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6">
          <div className="flex flex-col items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image 
                src={LOGO_CONFIG.MAIN_LOGO_URL} 
                alt={LOGO_CONFIG.ALT_TEXT} 
                width={64}
                height={64}
                className="h-16 w-16 mb-4" 
              />
            </Link>
            <h2 className="text-3xl font-bold text-foreground">Reset Password</h2>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full">
                Request New Reset Link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image 
              src={LOGO_CONFIG.MAIN_LOGO_URL} 
              alt={LOGO_CONFIG.ALT_TEXT} 
              width={64}
              height={64}
              className="h-16 w-16 mb-4" 
            />
          </Link>
          <h2 className="text-3xl font-bold text-foreground">Reset Password</h2>
          <p className="text-muted-foreground text-center">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !isValidToken}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}