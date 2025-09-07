"use client"

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/index';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { LOGO_CONFIG } from '@/src/lib/logo-config';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, X, Lock } from 'lucide-react';

// Separate component that uses useSearchParams
function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid token for password reset
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('Invalid reset link. Please check your email or request a new password reset.');
        setIsValidToken(false);
        return;
      }

      console.log('Checking token:', token);

      // Check if token exists and is valid
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('email, expires_at, used')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        console.error('Token validation error:', tokenError);
        setError('Invalid reset link. Please check your email or request a new password reset.');
        setIsValidToken(false);
        return;
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now > expiresAt) {
        setError('Reset link has expired. Please request a new password reset.');
        setIsValidToken(false);
        return;
      }

      // Check if token is already used
      if (tokenData.used) {
        setError('Reset link has already been used. Please request a new password reset.');
        setIsValidToken(false);
        return;
      }

      console.log('Valid token found for email:', tokenData.email);
      setIsValidToken(true);
      setEmail(tokenData.email);
      setError('');
      
      // Get username from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('email', tokenData.email)
        .single();

      if (profileData) {
        setUsername(profileData.username || 'User');
      }
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
        throw new Error('Invalid reset token');
      }

      console.log('Resetting password for email:', email);

      // Update the user's password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (updateError) {
        throw updateError;
      }

      // Mark token as used
      const { error: tokenUpdateError } = await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);

      if (tokenUpdateError) {
        console.error('Failed to mark token as used:', tokenUpdateError);
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
            to: email,
            subject: 'Password Reset Confirmation - Trader\'s Journal',
            type: 'passwordResetConfirmation',
            newPassword: password,
            username: username
          })
        });

        if (!emailResponse.ok) {
          console.error('Failed to send confirmation email:', await emailResponse.text());
        } else {
          console.log('Confirmation email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      console.log('Password reset successful');
      setSuccess(true);
      setShowSuccessModal(true);
      
      toast({
        id: `password-reset-success-${Date.now()}`,
        title: 'Success',
        description: 'Your password has been reset successfully. You can now log in with your new password.'
      });
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

  const handleBackToLogin = () => {
    router.push('/login');
  };

  if (!isValidToken && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="w-full max-w-md">
          <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex flex-col items-center">
              <Link href="/" className="hover:opacity-80 transition-all duration-300 hover:scale-105">
                <img 
                  src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images/traders-journal_pro.png" 
                  alt="Trader's Journal Logo" 
                  className="h-20 w-20 mb-4 drop-shadow-lg" 
                />
              </Link>
              <h2 className="text-3xl font-bold text-foreground mb-2">Reset Password</h2>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            
            <div className="text-center space-y-4">
              <Link href="/forgot-password">
                <Button variant="outline" className="w-full h-12 text-base font-semibold">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="w-full h-12 text-base font-semibold">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="w-full max-w-md">
          <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex flex-col items-center">
              <Link href="/" className="hover:opacity-80 transition-all duration-300 hover:scale-105">
                <img 
                  src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images/traders-journal_pro.png" 
                  alt="Trader's Journal Logo" 
                  className="h-20 w-20 mb-4 drop-shadow-lg" 
                />
              </Link>
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Password Reset Successful!</h2>
              <p className="text-muted-foreground text-center leading-relaxed">
                Your password has been reset successfully. You will be redirected to the login page shortly.
              </p>
            </div>
            
            <div className="text-center">
              <Link href="/login">
                <Button className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="flex flex-col items-center">
            <Link href="/" className="hover:opacity-80 transition-all duration-300 hover:scale-105">
              <img 
                src={LOGO_CONFIG.MAIN_LOGO_URL} 
                alt={LOGO_CONFIG.ALT_TEXT} 
                className="h-20 w-20 mb-4 drop-shadow-lg" 
              />
            </Link>
            <h2 className="text-3xl font-bold text-foreground mb-2">Reset Password</h2>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Enter your new password below. Make sure it's secure and easy to remember.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pl-12 pr-12 h-12 border-border/50 focus:border-primary/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-12 pr-12 h-12 border-border/50 focus:border-primary/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
              disabled={isLoading || !isValidToken}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Enhanced Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold text-foreground">Password Reset Complete!</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <p className="text-xs text-muted-foreground">
                A confirmation email has been sent to {email} with your new password details.
              </p>
            </div>
            
            <div className="flex flex-col space-y-3 pt-4">
              <Button 
                onClick={handleBackToLogin}
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Go to Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSuccessModal(false)}
                className="w-full h-12 text-base font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component with Suspense boundary
export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}