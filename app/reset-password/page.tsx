"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        id: `error-${Date.now()}`, // Add a unique ID for the error toast
        title: 'Error',
        description: 'Passwords do not match'
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      const { error } = await supabase.auth.updateUser({ password });
  
      if (error) {
        throw error;
      }
  
      toast({
        id: `password-reset-${Date.now()}`, // Add a unique ID for the success toast
        title: 'Password Reset',
        description: 'Your password has been successfully reset'
      });
  
      router.push('/login');
    } catch (error: unknown) {
      toast({
        id: `error-${Date.now()}`, // Add a unique ID for the error toast
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

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
          <h2 className="text-3xl font-bold text-foreground">Reset Password</h2>
        </div>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2 text-sm">
                {hasMinLength ? 
                  <Check className="text-primary" size={14} /> : 
                  <X className="text-destructive" size={14} />
                }
                <span className={cn(
                  "transition-colors",
                  hasMinLength ? "text-primary" : "text-destructive"
                )}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                {hasUpperCase ? 
                  <Check className="text-primary" size={14} /> : 
                  <X className="text-destructive" size={14} />
                }
                <span className={cn(
                  "transition-colors",
                  hasUpperCase ? "text-primary" : "text-destructive"
                )}>
                  One uppercase letter
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                {hasLowerCase ? 
                  <Check className="text-primary" size={14} /> : 
                  <X className="text-destructive" size={14} />
                }
                <span className={cn(
                  "transition-colors",
                  hasLowerCase ? "text-primary" : "text-destructive"
                )}>
                  One lowercase letter
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                {hasNumber ? 
                  <Check className="text-primary" size={14} /> : 
                  <X className="text-destructive" size={14} />
                }
                <span className={cn(
                  "transition-colors",
                  hasNumber ? "text-primary" : "text-destructive"
                )}>
                  One number
                </span>
              </div>
            </div>
          </div>
          <Input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}