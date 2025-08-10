"use client"

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '../src/hooks/use-toast';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '../src/lib/utils';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { LOGO_CONFIG } from '../src/lib/logo-config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check if user has a valid session for password reset
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            id: 'no-session',
            title: 'Invalid Session',
            description: 'No active session found. Please request a new password reset.',
            variant: "destructive"
          });
          router.push('/forgot-password');
          return;
        }
        setIsValidSession(true);
      } catch (error) {
        console.error('Session check error:', error);
        toast({
          id: 'session-error',
          title: 'Session Error',
          description: 'Unable to verify your session. Please try again.',
          variant: "destructive"
        });
        router.push('/forgot-password');
      } finally {
        setSessionChecked(true);
      }
    };

    checkSession();
  }, [supabase.auth, router, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        id: `error-${Date.now()}`,
        title: 'Error',
        description: 'Passwords do not match'
      });
      return;
    }

    // Check password requirements
    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
      toast({
        id: `error-${Date.now()}`,
        title: 'Password Requirements',
        description: 'Please ensure your password meets all requirements'
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          confirmPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      // Show success dialog
      setShowSuccessDialog(true);
      
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

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    router.push('/login');
  };

  // Password validation checks (same as registration)
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Don't render until session is checked
  if (!sessionChecked) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying your session...</p>
        </div>
      </div>
    );
  }

  // Don't render if no valid session
  if (!isValidSession) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4 relative"
        style={{ backgroundImage: "url('/images/auth-fullpage-background.jpg')" }}
      >
        <Link href="/" passHref legacyBehavior>
          <a className="absolute top-6 right-6 text-primary p-1.5 rounded-full hover:bg-black transition-colors z-10">
            <X size={28} aria-label="Close" />
          </a>
        </Link>
        
        <div className="w-full max-w-md space-y-8 bg-cover bg-center p-8 sm:p-12 rounded-xl shadow-2xl"
          style={{ backgroundImage: "url('/images/auth-card-background.jpg')" }}
        >
        <div className="flex flex-col items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
              <img src={LOGO_CONFIG.MAIN_LOGO_URL} alt={LOGO_CONFIG.ALT_TEXT} className="h-20 w-20 mb-4" />
          </Link>
            <h2 className="text-3xl font-bold text-foreground">
              Reset Password
            </h2>
            <p className="text-muted-foreground text-center mt-2">
              Choose a new password for your account
            </p>
        </div>
          
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                New Password
              </label>
              <div className="relative">
            <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password validation indicators */}
              <div className="space-y-2 mt-3">
              <div className="flex items-center space-x-2 text-sm">
                {hasMinLength ? 
                    <Check className="text-green-500" size={14} /> : 
                    <X className="text-red-500" size={14} />
                }
                <span className={cn(
                  "transition-colors",
                    hasMinLength ? "text-green-500" : "text-red-500"
                )}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                {hasUpperCase ? 
                    <Check className="text-green-500" size={14} /> : 
                    <X className="text-red-500" size={14} />
                }
                <span className={cn(
                  "transition-colors",
                    hasUpperCase ? "text-green-500" : "text-red-500"
                )}>
                  One uppercase letter
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                {hasLowerCase ? 
                    <Check className="text-green-500" size={14} /> : 
                    <X className="text-red-500" size={14} />
                }
                <span className={cn(
                  "transition-colors",
                    hasLowerCase ? "text-green-500" : "text-red-500"
                )}>
                  One lowercase letter
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                {hasNumber ? 
                    <Check className="text-green-500" size={14} /> : 
                    <X className="text-red-500" size={14} />
                }
                <span className={cn(
                  "transition-colors",
                    hasNumber ? "text-green-500" : "text-red-500"
                )}>
                  One number
                </span>
              </div>
            </div>
          </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Confirm New Password
              </label>
              <div className="relative">
          <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password match indicator */}
              {confirmPassword.length > 0 && (
                <div className="flex items-center space-x-2 text-sm">
                  {passwordsMatch ? 
                    <Check className="text-green-500" size={14} /> : 
                    <X className="text-red-500" size={14} />
                  }
                  <span className={cn(
                    "transition-colors",
                    passwordsMatch ? "text-green-500" : "text-red-500"
                  )}>
                    Passwords match
                  </span>
                </div>
              )}
            </div>

          <Button 
            type="submit" 
            className="w-full" 
              disabled={
                isLoading || 
                !hasMinLength || 
                !hasUpperCase || 
                !hasLowerCase || 
                !hasNumber || 
                !passwordsMatch
              }
            >
              {isLoading ? (
                <>
                  <span className="mr-2">Resetting...</span>
                  <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent rounded-full"></div>
                </>
              ) : (
                "Reset Password"
              )}
          </Button>
        </form>
      </div>
    </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600">Password Reset Successful!</DialogTitle>
            <DialogDescription>
              Your password has been successfully reset. You will receive a confirmation email with your new password details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button onClick={handleSuccessDialogClose}>
              Continue to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}