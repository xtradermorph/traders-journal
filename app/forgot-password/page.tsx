"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { v4 as uuidv4 } from 'uuid';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      // Generate a secure reset token
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      // Store the reset token in Supabase
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          email: email,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (tokenError) {
        // If table doesn't exist, create it first
        if (tokenError.message.includes('relation "password_reset_tokens" does not exist')) {
          await supabase.rpc('create_password_reset_table');
          
          // Try inserting again
          const { error: retryError } = await supabase
            .from('password_reset_tokens')
            .insert({
              email: email,
              token: resetToken,
              expires_at: expiresAt.toISOString(),
              used: false
            });
            
          if (retryError) {
            throw retryError;
          }
        } else {
          throw tokenError;
        }
      }

      // Create the reset link
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
      
      console.log('Sending password reset email to:', email);
      console.log('Reset link:', resetLink);
      
      // Send email via your Resend function
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Password Reset Request - Trader\'s Journal',
          type: 'passwordReset',
          resetLink: resetLink
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }

      console.log('Password reset email sent successfully');
      
      toast({
        id: `password-reset-${Date.now()}`,
        title: 'Password Reset',
        description: 'Check your email for the password reset link'
      });
  
      // Redirect back to login page
      router.push('/login');
    } catch (error: unknown) {
      console.error('Password reset failed:', error);
      toast({
        id: `error-${Date.now()}`,
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <h2 className="text-3xl font-bold text-foreground">Forgot Password</h2>
        </div>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}