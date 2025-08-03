"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://tradersjournal.pro/reset-password`
      });
  
      if (error) {
        throw error;
      }
  
      toast({
        id: `password-reset-${Date.now()}`,
        title: 'Password Reset',
        description: 'Check your email for the password reset link'
      });
  
      // Redirect back to login page
      router.push('/login');
    } catch (error: unknown) {
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
            <img 
              src="/logo.png" 
              alt="Trader's Journal Logo" 
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